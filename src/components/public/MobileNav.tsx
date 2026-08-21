"use client";

import { useState } from "react";
import type { NavLink } from "@/lib/settings";
import { NavItem } from "./NavItem";

/**
 * The nav links list, responsive: a normal horizontal row from `sm:` up
 * (unchanged from before), collapsed behind a hamburger button below that
 * -- previously the links were always rendered in one `flex` row with no
 * mobile fallback at all, so a menu with more than 2-3 items (or one with
 * submenus) simply overflowed the screen width on a phone
 * ("asegura de que todo esto sea responsive asi se ajuste a el celular").
 */
export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ul className="hidden items-center gap-6 text-sm text-white/90 sm:flex">
        {links.map((l, i) => (
          <NavItem key={`${l.href}-${i}`} link={l} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className="flex h-9 w-9 items-center justify-center text-white sm:hidden"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4L16 16M16 4L4 16" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M0 1H22M0 8H22M0 15H22" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <ul className="absolute left-0 top-full flex w-full flex-col gap-1 border-t border-white/10 bg-[#1c1140] px-6 py-4 text-sm text-white/90 sm:hidden">
          {links.map((l, i) => (
            <NavItem key={`${l.href}-${i}`} link={l} />
          ))}
        </ul>
      )}
    </>
  );
}
