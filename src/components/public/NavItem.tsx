"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NavLink } from "@/lib/settings";

function LinkItem({ link, className }: { link: NavLink; className?: string }) {
  const isExternal = /^https?:\/\//i.test(link.href);
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
    <Link href={link.href} target={link.newTab ? "_blank" : undefined} className={className}>
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
        <LinkItem link={link} className="hover:text-white" />
      </li>
    );
  }

  return (
    <li ref={ref} className="relative">
      <span className="flex items-center gap-1">
        <LinkItem link={link} className="hover:text-white" />
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
        <ul className="absolute left-0 top-full z-10 mt-2 min-w-[10rem] rounded-md border border-white/10 bg-[#1c1140] py-1 shadow-lg">
          {link.children.map((child, i) => (
            <li key={`${child.href}-${i}`}>
              <LinkItem link={child} className="block px-4 py-2 hover:bg-white/10 hover:text-white" />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
