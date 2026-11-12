"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

export type LatestPost = { slug: string; title: string; image: string | null; publishedAt: string; minutes: number };
export type LatestPostsValue = { posts: LatestPost[]; autoplay: boolean; intervalSeconds: number; author: string };

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

const dateFormat = new Intl.DateTimeFormat("es", { timeZone: "America/Santo_Domingo", day: "numeric", month: "short" });

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A3F7A]";
const NAV = `flex h-10 w-10 items-center justify-center rounded-full bg-[#1F2A44] text-white hover:bg-[#3A3F7A] ${FOCUS}`;

function Card({ post, author }: { post: LatestPost; author: string }) {
  const href = `/blog/${post.slug}`;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-md border border-slate-300 bg-white">
      {post.image && (
        // Decorative: the title link beside it carries the name, so keep it out of the tab order.
        <a href={href} tabIndex={-1} aria-hidden="true" className="block aspect-[16/9] w-full overflow-hidden bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt="" className="h-full w-full object-cover" loading="lazy" />
        </a>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-sm text-slate-600">
          {author} · {dateFormat.format(new Date(post.publishedAt))}. · {post.minutes} min de lectura
        </p>
        <h3 className="text-lg font-semibold leading-snug text-[#1F2A44]">
          <a href={href} className={`hover:underline ${FOCUS}`}>
            {post.title}
          </a>
        </h3>
      </div>
    </article>
  );
}

/**
 * The newest posts as cards in a smooth sliding strip: every move slides the whole row sideways
 * (and loops round without a visible jump). Shows 3 cards at once (2 / 1 on smaller screens); with
 * fewer posts than fit, it is a plain row with no controls. Accessible like the image carousel:
 * labelled group, arrow keys, buttons and dots, polite position announcement. There is no pause
 * button: the rotation stops by itself while the pointer is over it or something inside has keyboard
 * focus, and it never moves for visitors who prefer reduced motion (they use the arrows).
 */
export function LatestPosts({ value }: { value: LatestPostsValue }) {
  const posts = value.posts ?? [];
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

  // Without animation there is no transitionend to snap back from the looping copies, so show the
  // position modulo n instead (same cards, no empty gaps).
  const pos = reduced && rotates ? index % n : index;

  if (n === 0) return null;

  const track = rotates ? [...posts, ...posts.slice(0, visible)] : posts;
  const shown = Array.from({ length: visible }, (_, k) => posts[(current + k) % n]);
  const announce = `Mostrando entradas ${shown.map((p) => `«${p.title}»`).join(", ")}. ${n} entradas en total.`;
  const slideWidth = 100 / visible;

  return (
    <div
      role="group"
      aria-roledescription="carrusel"
      aria-label="Entradas recientes. Usa las flechas izquierda y derecha para cambiar de entradas."
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
            transform: `translateX(-${pos * slideWidth}%)`,
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
            const inView = i >= pos && i < pos + visible;
            const isCopy = i >= n;
            return (
              <div
                key={`${p.slug}-${isCopy ? "c" : "r"}`}
                className="shrink-0 px-3"
                style={{ width: `${slideWidth}%` }}
                // Cards out of view (and the looping copies) are not reachable by keyboard or screen reader.
                inert={rotates && (!inView || isCopy)}
                aria-hidden={rotates && (!inView || isCopy) ? true : undefined}
              >
                <Card post={p} author={value.author} />
              </div>
            );
          })}
        </div>
      </div>

      {rotates && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button type="button" aria-label="Entradas anteriores" className={NAV} onClick={() => step(-1)}>
            <ChevronLeftIcon size={22} />
          </button>
          <div className="flex min-w-0 flex-wrap items-center justify-center">
            {posts.map((p, i) => (
              <button
                key={p.slug}
                type="button"
                aria-label={`Ir a la entrada ${i + 1} de ${n}: ${p.title}`}
                aria-current={i === current ? "true" : undefined}
                onClick={() => goTo(i)}
                className={`flex h-6 w-6 items-center justify-center rounded-full ${FOCUS}`}
              >
                <span className={`block h-3 w-3 rounded-full border border-[#1F2A44] ${i === current ? "bg-[#1F2A44]" : "bg-transparent"}`} />
              </button>
            ))}
          </div>
          <button type="button" aria-label="Entradas siguientes" className={NAV} onClick={() => step(1)}>
            <ChevronRightIcon size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
