"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/icons";

export type LinkedinPost = { url: string; text: string; date: string; image: string };
export type LinkedinPostsValue = { title: string; posts: LinkedinPost[]; visible: number; autoplay: boolean; intervalSeconds: number };

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const dateFormat = new Intl.DateTimeFormat("es", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3A3F7A]";
const NAV = `flex h-9 w-9 items-center justify-center rounded-full bg-[#1F2A44] text-white hover:bg-[#3A3F7A] ${FOCUS}`;

function Card({ post }: { post: LinkedinPost }) {
  return (
    <li>
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex gap-3 rounded-md border border-slate-300 bg-white p-3 hover:border-[#3A3F7A] hover:shadow-sm ${FOCUS}`}
      >
        {post.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image} alt="" className="h-14 w-14 shrink-0 rounded object-cover" loading="lazy" />
        )}
        <span className="min-w-0">
          {post.date && (
            <time dateTime={post.date} className="block text-xs text-slate-600">
              {dateFormat.format(new Date(`${post.date}T12:00:00Z`))}
            </time>
          )}
          <span className="line-clamp-3 text-sm leading-snug text-[#1F2A44]">{post.text || "Ver la publicación en LinkedIn"}</span>
          <span className="sr-only"> (se abre en LinkedIn, en una pestaña nueva)</span>
        </span>
      </a>
    </li>
  );
}

/**
 * Compact cards for the latest LinkedIn posts, a few at a time, rotating by one. Meant for a
 * narrow column. Autoplay pauses on hover and keyboard focus, has a pause button, and is off for
 * visitors who prefer reduced motion. Links open LinkedIn in a new tab.
 */
export function LinkedinPosts({ value }: { value: LinkedinPostsValue }) {
  const posts = value.posts ?? [];
  const n = posts.length;
  const visible = Math.min(Math.max(2, value.visible), n);
  const rotates = n > visible;
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const [start, setStart] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const go = useCallback((i: number) => setStart(((i % n) + n) % n), [n]);
  const current = n ? start % n : 0;
  const autoplaying = value.autoplay && rotates && !paused && !hovered && !focused && !reduced;
  useEffect(() => {
    if (!autoplaying) return;
    const t = window.setTimeout(() => go(current + 1), Math.max(3, value.intervalSeconds) * 1000);
    return () => window.clearTimeout(t);
  }, [autoplaying, current, go, value.intervalSeconds]);

  if (n === 0) return null;
  const shown = Array.from({ length: visible }, (_, k) => posts[(current + k) % n]);

  return (
    <section
      aria-label={value.title || "Publicaciones de LinkedIn"}
      className="w-full"
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      {value.title && <h3 className="mb-3 text-lg font-semibold text-[#1F2A44]">{value.title}</h3>}
      <ul className="space-y-2">
        {shown.map((p, k) => (
          <Card key={`${p.url}#${k}`} post={p} />
        ))}
      </ul>
      {rotates && (
        <div className="mt-3 flex items-center gap-2">
          <button type="button" aria-label="Publicaciones anteriores" className={NAV} onClick={() => go(current - 1)}>
            <ChevronLeftIcon size={18} />
          </button>
          {value.autoplay && !reduced && (
            <button type="button" aria-label={paused ? "Reanudar rotación" : "Pausar rotación"} className={NAV} onClick={() => setPaused((p) => !p)}>
              {paused ? <PlayIcon size={12} /> : <PauseIcon size={12} />}
            </button>
          )}
          <button type="button" aria-label="Publicaciones siguientes" className={NAV} onClick={() => go(current + 1)}>
            <ChevronRightIcon size={18} />
          </button>
          <p role="status" aria-live="polite" className="sr-only">
            {autoplaying ? "" : `Mostrando ${visible} de ${n} publicaciones.`}
          </p>
        </div>
      )}
    </section>
  );
}
