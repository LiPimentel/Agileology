import { getSiteSettings } from "@/lib/settings";

const SOCIAL: Array<{ key: "facebookUrl" | "twitterUrl" | "linkedinUrl" | "instagramUrl"; label: string }> = [
  { key: "facebookUrl", label: "Facebook" },
  { key: "twitterUrl", label: "Twitter" },
  { key: "linkedinUrl", label: "LinkedIn" },
  { key: "instagramUrl", label: "Instagram" },
];

export async function Footer() {
  const settings = await getSiteSettings();
  const socialLinks = SOCIAL.filter((s) => settings[s.key]);

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 px-6 py-8 text-sm text-slate-600">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        {(settings.phone || settings.whatsapp) && (
          <div className="flex gap-4">
            {settings.phone && (
              <a href={`tel:${settings.phone}`} className="hover:text-violet-800">
                📞 {settings.phone}
              </a>
            )}
            {settings.whatsapp && (
              <a
                href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-violet-800"
              >
                WhatsApp
              </a>
            )}
          </div>
        )}
        {socialLinks.length > 0 && (
          <div className="flex gap-4">
            {socialLinks.map((s) => (
              <a
                key={s.key}
                href={settings[s.key] as string}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-violet-800"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
        <p>{settings.footerText ?? `© ${new Date().getFullYear()} ${settings.siteTitle}`}</p>
        <a href="/privacy-policy" className="text-xs text-slate-400 hover:text-violet-700">
          Política de privacidad
        </a>
      </div>
    </footer>
  );
}
