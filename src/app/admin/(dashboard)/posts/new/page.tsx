import { NewPostForm } from "./NewPostForm";

export const metadata = { title: "Nuevo post — Backoffice" };
export const dynamic = "force-dynamic";

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nuevo post</h1>
      <NewPostForm />
    </div>
  );
}
