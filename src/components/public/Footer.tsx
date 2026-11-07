import Link from "next/link";
import { getFooterLinks, getSiteSettings } from "@/lib/settings";
import { FacebookIcon, InstagramIcon, LinkedinIcon, TelegramIcon, TwitterIcon } from "./SocialIcons";
import { TrackedLink } from "./TrackedLink";
import { PhoneIcon } from "@/components/icons";

const SOCIAL: Array<{
  urlKey: "facebookUrl" | "twitterUrl" | "linkedinUrl" | "instagramUrl" | "telegramUrl";
  iconKey?: "facebookIconUrl" | "twitterIconUrl" | "linkedinIconUrl" | "instagramIconUrl";
  label: string;
  Icon: () => React.ReactElement;
}> = [
  { urlKey: "facebookUrl", iconKey: "facebookIconUrl", label: "Facebook", Icon: FacebookIcon },
  { urlKey: "twitterUrl", iconKey: "twitterIconUrl", label: "Twitter / X", Icon: TwitterIcon },
  { urlKey: "linkedinUrl", iconKey: "linkedinIconUrl", label: "LinkedIn", Icon: LinkedinIcon },
  { urlKey: "instagramUrl", iconKey: "instagramIconUrl", label: "Instagram", Icon: InstagramIcon },
  { urlKey: "telegramUrl", label: "Telegram", Icon: TelegramIcon },
];

export async function Footer() {
  const [settings, footerLinks] = await Promise.all([getSiteSettings(), getFooterLinks()]);
  const socialLinks = SOCIAL.filter((s) => settings[s.urlKey]);

  return (
    <footer className="mt-auto bg-[#1F2A44] px-6 py-8 text-sm text-[#E6E9EF]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
        {(settings.phone || settings.whatsapp) && (
          <div className="flex gap-4">
            {settings.phone && (
              <TrackedLink href={`tel:${settings.phone}`} label="phone" internal={false} className="hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <PhoneIcon size={16} className="mr-1.5 inline align-text-bottom" /> {settings.phone}
              </TrackedLink>
            )}
            {settings.whatsapp && (
              <TrackedLink
                href={`https://wa.me/${settings.whatsapp.replace(/[^0-9]/g, "")}`}
                label="whatsapp"
                internal={false}
                newTab
                className="hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                WhatsApp
              </TrackedLink>
            )}
          </div>
        )}
        {socialLinks.length > 0 && (
          <div className="flex gap-4">
            {socialLinks.map((s) => {
              const customIcon = s.iconKey ? settings[s.iconKey] : null;
              return (
                <TrackedLink
                  key={s.urlKey}
                  href={settings[s.urlKey] as string}
                  label={`social:${s.urlKey.replace("Url", "")}`}
                  internal={false}
                  newTab
                  className="text-[#E6E9EF] hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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
                  className="text-[#B4B9C4] hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {l.label}
                </a>
              ) : (
                <Link key={`${l.href}-${i}`} href={l.href} target={l.newTab ? "_blank" : undefined} className="text-[#B4B9C4] hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  {l.label}
                </Link>
              ),
            )}
          </div>
        )}
        <p>{settings.footerText ?? `© ${new Date().getFullYear()} ${settings.siteTitle}`}</p>
        <Link href="/privacy-policy" className="text-xs text-[#B4B9C4] hover:text-white hover:underline focus-visible:text-white focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          Política de privacidad
        </Link>
      </div>
    </footer>
  );
}
