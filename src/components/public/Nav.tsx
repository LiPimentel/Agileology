import Link from "next/link";
import { getPublicNavPages, getSiteSettings } from "@/lib/settings";

export async function Nav() {
  const [pages, settings] = await Promise.all([getPublicNavPages(), getSiteSettings()]);

  const links = [
    ...pages.filter((p) => p.slug !== "home").map((p) => ({ href: `/${p.slug}`, label: p.title })),
    { href: "/blog", label: "Blog" },
  ];

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
          <li>
            <Link href="/" className="hover:text-white">
              Inicio
            </Link>
          </li>
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="hover:text-white">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
