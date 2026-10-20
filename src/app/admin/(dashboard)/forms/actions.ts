"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sanitizePlainText } from "@/lib/sanitize";

export type FormFormState = { error?: string; formId?: string; savedAt?: number };

const FIELD_TYPES = ["text", "email", "tel", "textarea", "select", "checkbox"] as const;

type SubmittedField = {
  id: string;
  label: string;
  fieldType: string;
  required: boolean;
  placeholder: string;
  options: string[];
};

function parseFields(raw: string): SubmittedField[] {
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

export async function createForm(_prev: FormFormState, formData: FormData): Promise<FormFormState> {
  const admin = await requireAdmin();
  const name = sanitizePlainText(String(formData.get("name") ?? "")).slice(0, 200) || "Nuevo formulario";
  const form = await prisma.formDefinition.create({ data: { name } });
  await logAudit({ adminId: admin.id, action: "create_form", entityType: "FormDefinition", entityId: form.id });
  redirect(`/admin/forms/${form.id}`);
}

/** Every save rewrites this form's fields from scratch -- same "the draft state is the source of truth" convention pages' block editor uses (upsertPageContent). */
export async function saveForm(_prev: FormFormState, formData: FormData): Promise<FormFormState> {
  const admin = await requireAdmin();
  const formId = String(formData.get("formId") ?? "");
  const name = sanitizePlainText(String(formData.get("name") ?? "")).slice(0, 200);
  const destinationEmailRaw = sanitizePlainText(String(formData.get("destinationEmail") ?? "")).slice(0, 200);
  const successMessage = sanitizePlainText(String(formData.get("successMessage") ?? "")).slice(0, 500) || "Gracias, tu mensaje fue enviado.";
  const fields = parseFields(String(formData.get("fieldsJson") ?? "[]"));

  if (!name) return { error: "El formulario necesita un nombre." };
  if (destinationEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinationEmailRaw)) {
    return { error: "El email de destino no es válido." };
  }

  try {
    await prisma.$transaction([
      prisma.formDefinition.update({
        where: { id: formId },
        data: { name, destinationEmail: destinationEmailRaw || null, successMessage },
      }),
      prisma.formField.deleteMany({ where: { formId } }),
      prisma.formField.createMany({
        data: fields.map((f, order) => ({
          formId,
          label: sanitizePlainText(f.label).slice(0, 200) || `Campo ${order + 1}`,
          fieldType: FIELD_TYPES.includes(f.fieldType as (typeof FIELD_TYPES)[number]) ? f.fieldType : "text",
          required: Boolean(f.required),
          placeholder: sanitizePlainText(f.placeholder || "").slice(0, 200) || null,
          options: Array.isArray(f.options) ? f.options.map((o) => sanitizePlainText(o).slice(0, 100)).filter(Boolean) : [],
          order,
        })),
      }),
    ]);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo guardar." };
  }

  await logAudit({ adminId: admin.id, action: "save_form", entityType: "FormDefinition", entityId: formId });
  // Forms are resolved at render time (see lib/forms.ts), so every page
  // using this form needs its cache cleared too -- there's no per-page
  // list of "who uses this form" to target individually, so this
  // revalidates the whole public site's layout, same blunt approach a
  // site-wide settings change (e.g. the logo) already uses.
  revalidatePath("/", "layout");
  revalidatePath("/admin/forms");
  return { formId, savedAt: Date.now() };
}

export async function deleteForm(formId: string) {
  const admin = await requireAdmin();
  await prisma.formDefinition.delete({ where: { id: formId } });
  await logAudit({ adminId: admin.id, action: "delete_form", entityType: "FormDefinition", entityId: formId });
  revalidatePath("/admin/forms");
  revalidatePath("/", "layout");
}

export async function markFormSubmissionRead(id: string) {
  const admin = await requireAdmin();
  const submission = await prisma.formSubmission.update({ where: { id }, data: { status: "read" } });
  await logAudit({ adminId: admin.id, action: "mark_read", entityType: "FormSubmission", entityId: id });
  revalidatePath(`/admin/forms/${submission.formId}/submissions`);
}

/** RS-15: admin can delete form submissions containing personal data on request. */
export async function deleteFormSubmission(id: string) {
  const admin = await requireAdmin();
  const submission = await prisma.formSubmission.delete({ where: { id } });
  await logAudit({ adminId: admin.id, action: "delete", entityType: "FormSubmission", entityId: id });
  revalidatePath(`/admin/forms/${submission.formId}/submissions`);
}
