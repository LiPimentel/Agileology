import { NewPageForm } from "./NewPageForm";

export const metadata = { title: "Nueva página — Backoffice" };
export const dynamic = "force-dynamic";

export default function NewPagePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nueva página</h1>
      <NewPageForm />
    </div>
  );
}
