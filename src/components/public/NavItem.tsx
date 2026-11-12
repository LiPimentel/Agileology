"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/lib/settings";
import { safeHref } from "@/lib/href";

// The page the link points to (or a page inside it, e.g. /blog/some-post under /blog).
function isActivePath(pathname: string, href: string) {
  if (!href.startsWith("/")) return false;
  const target = href.split(/[?#]/)[0] || "/";
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

function LinkItem({ link: rawLink, className, active: forceActive }: { link: NavLink; className?: string; active?: boolean }) {
  const pathname = usePathname();
  const link = { ...rawLink, href: safeHref(rawLink.href) };
  const isExternal = /^https?:\/\//i.test(link.href);
  const active = forceActive ?? (!isExternal && isActivePath(pathname, link.href));
  className = `nav-link ${active ? "nav-link-active" : ""} ${className ?? ""}`;
  // Items whose address is "#proximamente" are placeholders: no page yet, only a "Coming soon" tooltip.
  if (link.href === "#proximamente") {
    return (
      <span className="group relative inline-block">
        <span tabIndex={0} aria-describedby="soon-tip" className={`${className} cursor-default text-white/60 focus-visible:outline-2 focus-visible:outline-white`}>
          {link.label}
          <span className="sr-only"> (Coming soon)</span>
        </span>
        <span role="tooltip" id="soon-tip" aria-hidden="true" className="pointer-events-none absolute left-4 top-full z-20 mt-1 hidden whitespace-nowrap rounded bg-white px-2 py-1 text-xs font-medium text-[#1F2A44] shadow group-hover:block group-focus-within:block">
          Coming soon
        </span>
      </span>
    );
  }
  if (isExternal) {
    return (
      <a
        href={link.href}
        target={link.newTab ? "_blank" : undefined}
        rel={link.newTab ? "noopener noreferrer" : undefined}
        className={className}
      >
        {link.label}
        {link.newTab && <span className="sr-only"> (se abre en una pestaña nueva)</span>}
      </a>
    );
  }
  return (
    <Link href={link.href} prefetch={link.newTab ? false : undefined} target={link.newTab ? "_blank" : undefined} className={className} aria-current={active ? "page" : undefined}>
      {link.label}
      {link.newTab && <span className="sr-only"> (se abre en una pestaña nueva)</span>}
    </Link>
  );
}

/**
 * A single nav item, rendered as a dropdown when it has submenu children
 * (menu item's own "Menú padre" field, set at /admin/settings/menu). Click
 * to open/close (not hover-only) so it works the same on touch devices,
 * closes on an outside click, and the parent link itself still navigates
 * normally -- only the little chevron toggles the dropdown.
 */
export function NavItem({ link }: { link: NavLink }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  const pathname = usePathname();
  const childActive = (link.children ?? []).some((c) => isActivePath(pathname, safeHref(c.href)));

  const buttonRef = useRef<HTMLButtonElement>(null);
  // A parent whose address is "/" is only a heading for its submenu (it would otherwise just go Home).
  const toggleOnly = link.href === "/" && (link.children?.length ?? 0) > 0;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onClickOutside);
    return () => document.removeEventListener("click", onClickOutside);
  }, [open]);

  if (!link.children || link.children.length === 0) {
    return (
      <li>
        <LinkItem link={link} className="rounded-sm hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />
      </li>
    );
  }

  return (
    <li
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <span className="flex items-center gap-1">
        {toggleOnly ? (
          <button
            type="button"
            ref={buttonRef}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`nav-link ${childActive ? "nav-link-active" : ""} rounded-sm hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
          >
            {link.label}
            <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" className={`ml-1 inline-block transition-transform ${open ? "rotate-180" : ""}`}>
              <path d="M0 0L5 6L10 0" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <LinkItem link={link} active={childActive} className="rounded-sm hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />
        )}
        {!toggleOnly && <button
          type="button"
          ref={buttonRef}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Submenú de ${link.label}`}
          className="rounded-sm p-1 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M0 0L5 6L10 0" fill="currentColor" />
          </svg>
        </button>}
      </span>
      {open && (
        <ul className="absolute left-0 top-full z-10 mt-2 min-w-[10rem] rounded-md border border-white/10 bg-[#1F2A44] py-1 shadow-lg">
          {link.children.map((child, i) => (
            <li key={`${child.href}-${i}`} onClick={() => setOpen(false)}>
              <LinkItem link={child} className="block px-4 py-2 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white" />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
