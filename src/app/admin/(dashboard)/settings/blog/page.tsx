import { getBlogSettings } from "@/lib/settings";
import { BlogLayoutForm } from "./BlogLayoutForm";

export const metadata = { title: "Diseño del blog — Backoffice" };
export const dynamic = "force-dynamic";

export default async function BlogSettingsPage() {
  const settings = await getBlogSettings();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Diseño del blog</h1>
      <BlogLayoutForm layoutType={settings.layoutType} />
    </div>
  );
}
