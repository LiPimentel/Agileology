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
  if (isExternal) {
    return (
      <a
        href={link.href}
        target={link.newTab ? "_blank" : undefined}
        rel={link.newTab ? "noopener noreferrer" : undefined}
        className={className}
      >
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} target={link.newTab ? "_blank" : undefined} className={className} aria-current={active ? "page" : undefined}>
      {link.label}
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
    <li ref={ref} className="relative">
      <span className="flex items-center gap-1">
        <LinkItem link={link} active={childActive || undefined} className="rounded-sm hover:text-white focus-visible:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Submenú de ${link.label}`}
          className="p-1 hover:text-white"
        >
          <svg width="10" height="6" viewBox="0 0 10 6" className={`transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M0 0L5 6L10 0" fill="currentColor" />
          </svg>
        </button>
      </span>
      {open && (
        <ul className="absolute left-0 top-full z-10 mt-2 min-w-[10rem] rounded-md border border-white/10 bg-[#1F2A44] py-1 shadow-lg">
          {link.children.map((child, i) => (
            <li key={`${child.href}-${i}`}>
              <LinkItem link={child} className="block px-4 py-2 hover:bg-white/10 hover:text-white focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white" />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
