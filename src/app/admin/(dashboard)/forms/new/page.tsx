import { NewFormForm } from "./NewFormForm";

export const metadata = { title: "Nuevo formulario — Backoffice" };
export const dynamic = "force-dynamic";

export default function NewFormPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">Nuevo formulario</h1>
      <NewFormForm />
    </div>
  );
}
