import Link from "next/link";
import { getFooterLinks, getSiteSettings } from "@/lib/settings";
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon } from "./SocialIcons";
import { TrackedLink } from "./TrackedLink";

const SOCIAL: Array<{
  urlKey: "facebookUrl" | "twitterUrl" | "linkedinUrl" | "instagramUrl";
  iconKey: "facebookIconUrl" | "twitterIconUrl" | "linkedinIconUrl" | "instagramIconUrl";
  label: string;
  Icon: () => React.ReactElement;
}> = [
  { urlKey: "facebookUrl", iconKey: "facebookIconUrl", label: "Facebook", Icon: FacebookIcon },
  { urlKey: "twitterUrl", iconKey: "twitterIconUrl", label: "Twitter / X", Icon: TwitterIcon },
  { urlKey: "linkedinUrl", iconKey: "linkedinIconUrl", label: "LinkedIn", Icon: LinkedinIcon },
  { urlKey: "instagramUrl", iconKey: "instagramIconUrl", label: "Instagram", Icon: InstagramIcon },
];

export async function Footer() {
  const [settings, footerLinks] = await Promise.all([getSiteSettings(), getFooterLinks()]);
  const socialLinks = SOCIAL.filter((s) => settings[s.urlKey]);

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50 px-6 py-8 text-sm text-slate-600">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        {(settings.phone || settings.whatsapp) && (
          <div className="flex gap-4">
            {settings.phone && (
              <TrackedLink href={`tel:${settings.phone}`} label="phone" internal={false} className="hover:text-violet-800">
                📞 {settings.phone}
              </TrackedLink>
            )}
            {settings.whatsapp && (
              <TrackedLink
                href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`}
                label="whatsapp"
                internal={false}
                newTab
                className="hover:text-violet-800"
              >
                WhatsApp
              </TrackedLink>
            )}
          </div>
        )}
        {socialLinks.length > 0 && (
          <div className="flex gap-4">
            {socialLinks.map((s) => {
              const customIcon = settings[s.iconKey];
              return (
                <TrackedLink
                  key={s.urlKey}
                  href={settings[s.urlKey] as string}
                  label={`social:${s.urlKey.replace("Url", "")}`}
                  internal={false}
                  newTab
                  className="text-slate-500 hover:text-violet-800"
                >
                  {customIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={customIcon} alt="" className="h-[18px] w-[18px] object-contain" />
                  ) : (
                    <s.Icon />
                  )}
                  <span className="sr-only">{s.label}</span>
                </TrackedLink>
              );
            })}
          </div>
        )}
        {footerLinks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            {footerLinks.map((l, i) =>
              /^https?:\/\//i.test(l.href) ? (
                <a
                  key={`${l.href}-${i}`}
                  href={l.href}
                  target={l.newTab ? "_blank" : undefined}
                  rel={l.newTab ? "noopener noreferrer" : undefined}
                  className="text-slate-400 hover:text-violet-700"
                >
                  {l.label}
                </a>
              ) : (
                <Link key={`${l.href}-${i}`} href={l.href} target={l.newTab ? "_blank" : undefined} className="text-slate-400 hover:text-violet-700">
                  {l.label}
                </Link>
              ),
            )}
          </div>
        )}
        <p>{settings.footerText ?? `© ${new Date().getFullYear()} ${settings.siteTitle}`}</p>
        <Link href="/privacy-policy" className="text-xs text-slate-400 hover:text-violet-700">
          Política de privacidad
        </Link>
      </div>
    </footer>
  );
}
