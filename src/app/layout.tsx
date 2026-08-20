import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteSettings } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: { default: settings.siteTitle, template: `%s — ${settings.siteTitle}` },
    description: settings.defaultMetaDescription ?? "Coaching y gestión ágil.",
    icons: settings.faviconUrl ? { icon: settings.faviconUrl } : undefined,
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Content fonts for the text block editor's font picker
          (TextBlockEditor.tsx / FONT_OPTIONS) -- deliberately a plain
          Google Fonts stylesheet link, NOT next/font/google like the two
          fixed UI fonts above. next/font generates a build-hashed,
          non-portable family name (e.g. '__Playfair_Display_a1b2c3'); that
          name would get baked verbatim into saved block content
          (style="font-family: ...") and go stale/silently stop rendering
          on the next rebuild, since the hash changes every build. A real,
          stable Google Fonts family name ("Playfair Display") persists
          correctly across rebuilds -- this is content data, not static UI.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Montserrat:wght@400;700&family=Lato:wght@400;700&family=Poppins:wght@400;700&family=Playfair+Display:wght@400;700&family=Merriweather:wght@400;700&family=Oswald:wght@400;700&family=Raleway:wght@400;700&family=Nunito:wght@400;700&family=Bebas+Neue&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
