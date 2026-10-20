import { Nav } from "@/components/public/Nav";
import { Footer } from "@/components/public/Footer";
import { CookieNotice } from "@/components/public/CookieNotice";
import { VisitTracker } from "@/components/public/VisitTracker";
import { ChatWidget } from "@/components/public/ChatWidget";
import { getCommunicationSettings, getSiteSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, comms] = await Promise.all([getSiteSettings(), getCommunicationSettings()]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <div className="flex-1">{children}</div>
      <Footer />
      {settings.cookieNoticeEnabled && <CookieNotice />}
      <VisitTracker />
      <ChatWidget
        title={comms.chatWidgetTitle}
        buttonLabel={comms.chatWidgetButtonLabel}
        placeholder={comms.chatWidgetPlaceholder}
        successMessage={comms.chatWidgetSuccessMessage}
      />
    </div>
  );
}
