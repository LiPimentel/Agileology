import Link from "next/link";
import { getMenuItems, getSiteSettings } from "@/lib/settings";
import { NavItem } from "./NavItem";

export async function Nav() {
  const [links, settings] = await Promise.all([getMenuItems(), getSiteSettings()]);

  return (
    <header className="border-b border-white/10 bg-[#1c1140]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold text-white">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.siteTitle} className="h-8 w-auto" />
          ) : (
            settings.siteTitle
          )}
        </Link>
        <ul className="flex items-center gap-6 text-sm text-white/90">
          {links.map((l, i) => (
            <NavItem key={`${l.href}-${i}`} link={l} />
          ))}
        </ul>
      </nav>
    </header>
  );
}
