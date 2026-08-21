import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormEditorForm } from "./FormEditorForm";

export const metadata = { title: "Editar formulario — Backoffice" };
export const dynamic = "force-dynamic";

export default async function FormEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await prisma.formDefinition.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form) notFound();

  return (
    <FormEditorForm
      form={{
        id: form.id,
        name: form.name,
        destinationEmail: form.destinationEmail ?? "",
        successMessage: form.successMessage,
        fields: form.fields.map((f) => ({
          id: f.id,
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          placeholder: f.placeholder ?? "",
          options: f.options,
        })),
      }}
    />
  );
}
