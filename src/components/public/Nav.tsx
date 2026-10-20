import Link from "next/link";
import { getMenuItems, getSiteSettings } from "@/lib/settings";
import { MobileNav } from "./MobileNav";

export async function Nav() {
  const [links, settings] = await Promise.all([getMenuItems(), getSiteSettings()]);

  return (
    <header className="relative border-b border-white/10 bg-[#1c1140]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="shrink-0 text-lg font-semibold text-white">
          {settings.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt={settings.siteTitle} className="h-8 w-auto" />
          ) : (
            settings.siteTitle
          )}
        </Link>
        <MobileNav links={links} />
      </nav>
    </header>
  );
}
