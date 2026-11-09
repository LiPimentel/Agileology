"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export type Quote = { text: string; author: string };
export type QuotesValue = { title: string; quotes: Quote[]; autoplay: boolean; intervalSeconds: number };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const BIG = "(min-width: 1024px)";
const MEDIUM = "(min-width: 640px)";

function subscribe(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}
const subscribeReduced = subscribe(REDUCED_MOTION);
function subscribeWidth(cb: () => void) {
  const offs = [subscribe(BIG)(cb), subscribe(MEDIUM)(cb)];
  return () => offs.forEach((off) => off());
}
// 3 cards on wide screens, 2 on tablets, 1 on phones.
const perViewNow = () => (window.matchMedia(BIG).matches ? 3 : window.matchMedia(MEDIUM).matches ? 2 : 1);

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A3F7A]";
const NAV = `flex h-10 w-10 items-center justify-center rounded-full bg-[#1F2A44] text-white hover:bg-[#3A3F7A] ${FOCUS}`;

// Agileology palette, rotated card by card: dark blue, lilac, blue. All three keep white text above 4.5:1.
const TONES = ["bg-[#1F2A44]", "bg-[#6B5BBE]", "bg-[#2F5B9E]"];

function Card({ quote, tone }: { quote: Quote; tone: number }) {
  return (
    <figure className={`flex h-full flex-col justify-between gap-4 rounded-md p-6 text-white shadow-sm ${TONES[tone % TONES.length]}`}>
      <blockquote className="text-lg leading-relaxed">
        <span aria-hidden="true" className="mr-1 text-3xl leading-none text-white/70">“</span>
        {quote.text}
      </blockquote>
      {quote.author && <figcaption className="text-base font-semibold">— {quote.author}</figcaption>}
    </figure>
  );
}

/**
 * A pool of quotes as cards in a smooth sliding strip: every move slides the whole row sideways
 * (and loops round without a visible jump). Shows 3 at once (2 / 1 on smaller screens); with
 * fewer quotes than fit, it is a plain row with no controls. Accessible like the image carousel:
 * labelled group, arrow keys, buttons and dots, polite position announcement. There is no pause
 * button: the rotation stops by itself while the pointer is over it or something inside has keyboard
 * focus, and it never moves for visitors who prefer reduced motion (they use the arrows).
 */
export function Quotes({ value }: { value: QuotesValue }) {
  const posts = value.quotes ?? [];
  const n = posts.length;
  const perView = useSyncExternalStore(subscribeWidth, perViewNow, () => 3);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const visible = Math.min(perView, n);
  const rotates = n > visible;

  // `index` is the track position of the first card in view. The track is the posts followed by a
  // copy of the first `visible` ones, so sliding past the last post lands on the copies and then
  // snaps (without animation) back to the real start.
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchX = useRef<number | null>(null);

  const current = n ? ((index % n) + n) % n : 0;
  const step = useCallback(
    (dir: 1 | -1) => {
      if (!rotates) return;
      if (dir === -1 && index === 0) {
        // Jump (unseen) to the copy of the start at the end of the track, then slide back one.
        setAnimate(false);
        setIndex(n);
        requestAnimationFrame(() => requestAnimationFrame(() => { setAnimate(true); setIndex(n - 1); }));
        return;
      }
      setAnimate(true);
      setIndex((i) => i + dir);
    },
    [index, n, rotates],
  );
  const goTo = (i: number) => { setAnimate(true); setIndex(i); };

  const autoplaying = value.autoplay && rotates && !hovered && !focused && !reduced;
  useEffect(() => {
    if (!autoplaying) return;
    const t = window.setTimeout(() => step(1), Math.max(3, value.intervalSeconds) * 1000);
    return () => window.clearTimeout(t);
  }, [autoplaying, index, step, value.intervalSeconds]);

  if (n === 0) return null;

  const track = rotates ? [...posts, ...posts.slice(0, visible)] : posts;
  const shown = Array.from({ length: visible }, (_, k) => posts[(current + k) % n]);
  const announce = `Mostrando frases ${shown.map((p) => `«${p.text}»${p.author ? `, de ${p.author}` : ""}`).join("; ")}. ${n} frases en total.`;
  const slideWidth = 100 / visible;

  return (
    <section className="w-full min-w-0 max-w-full">
    {value.title && <h2 className="mb-4 text-center text-2xl font-semibold text-[#1F2A44]">{value.title}</h2>}
    <div
      role="group"
      aria-roledescription="carrusel"
      aria-label={`${value.title || "Frases"}. Usa las flechas izquierda y derecha para cambiar de frases.`}
      tabIndex={rotates ? 0 : undefined}
      className={`w-full min-w-0 max-w-full rounded-md ${FOCUS}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={(e) => {
        if (!rotates || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
        if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      }}
      onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={(e) => {
        const s = touchX.current;
        const x = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (!rotates || s == null || x == null || Math.abs(x - s) < 50) return;
        step(x < s ? 1 : -1);
      }}
    >
      {rotates && (
        <p role="status" aria-live={autoplaying ? "off" : "polite"} className="sr-only">
          {announce}
        </p>
      )}
      <div className="w-0 min-w-full overflow-hidden">
        <div
          className="-mx-3 flex items-stretch"
          style={{
            transform: `translateX(-${index * slideWidth}%)`,
            transition: animate && !reduced ? "transform 700ms cubic-bezier(0.45, 0, 0.2, 1)" : "none",
          }}
          onTransitionEnd={() => {
            // Landed on the copies at the end: snap back to the same cards at the real start.
            if (rotates && index >= n) {
              setAnimate(false);
              setIndex(index - n);
            }
          }}
        >
          {track.map((p, i) => {
            const inView = i >= index && i < index + visible;
            const isCopy = i >= n;
            return (
              <div
                key={`${i}-${isCopy ? "c" : "r"}`}
                className="shrink-0 px-3"
                style={{ width: `${slideWidth}%` }}
                // Cards out of view (and the looping copies) are not reachable by keyboard or screen reader.
                inert={rotates && (!inView || isCopy)}
                aria-hidden={rotates && (!inView || isCopy) ? true : undefined}
              >
                <Card quote={p} tone={i % n} />
              </div>
            );
          })}
        </div>
      </div>

      {rotates && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button type="button" aria-label="Frases anteriores" className={NAV} onClick={() => step(-1)}>
            <ChevronLeftIcon size={22} />
          </button>
          <div className="flex items-center">
            {posts.map((_p, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir a la frase ${i + 1} de ${n}`}
                aria-current={i === current ? "true" : undefined}
                onClick={() => goTo(i)}
                className={`flex h-6 w-6 items-center justify-center rounded-full ${FOCUS}`}
              >
                <span className={`block h-3 w-3 rounded-full border border-[#1F2A44] ${i === current ? "bg-[#1F2A44]" : "bg-transparent"}`} />
              </button>
            ))}
          </div>
          <button type="button" aria-label="Frases siguientes" className={NAV} onClick={() => step(1)}>
            <ChevronRightIcon size={22} />
          </button>
        </div>
      )}
    </div>
    </section>
  );
}
