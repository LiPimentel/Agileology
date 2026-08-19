import { getCommunicationSettings } from "@/lib/settings";
import { CommunicationsForm } from "./CommunicationsForm";

export const metadata = { title: "Comunicaciones — Backoffice" };
export const dynamic = "force-dynamic";

export default async function CommunicationsSettingsPage() {
  const settings = await getCommunicationSettings();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Comunicaciones</h1>
      <CommunicationsForm chatEmail={settings.chatDestinationEmail} contactEmail={settings.contactFormDestinationEmail} />
    </div>
  );
}
