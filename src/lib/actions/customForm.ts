"use server";

import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { sendMail } from "@/lib/mailer";
import { getCommunicationSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/rateLimit";
import { headers } from "next/headers";

export type CustomFormState = { error?: string; success?: boolean };

/**
 * Public submission handler for a "customForm" block -- mirrors
 * submitContactForm (honeypot, rate limit, sanitize, email) but reads its
 * field list from the DB instead of a fixed name/email/message shape,
 * since a FormDefinition's fields are entirely admin-defined.
 */
export async function submitCustomForm(_prev: CustomFormState, formData: FormData): Promise<CustomFormState> {
  // Honeypot field: real visitors never fill this hidden input (7.8, RS-14).
  if (String(formData.get("company") ?? "").trim()) {
    return { success: true };
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`customform:${ip}`, 5, 60_000)) {
    return { error: "Demasiados envíos. Intenta de nuevo en un minuto." };
  }

  const formId = String(formData.get("formId") ?? "");
  const pageId = String(formData.get("pageId") ?? "") || null;
  if (!formId) return { error: "Formulario inválido." };

  const form = await prisma.formDefinition.findUnique({
    where: { id: formId },
    include: { fields: { orderBy: { order: "asc" } } },
  });
  if (!form) return { error: "Este formulario ya no está disponible." };

  const data: Record<string, string | boolean> = {};
  const emailLines: string[] = [];
  for (const field of form.fields) {
    if (field.fieldType === "checkbox") {
      const checked = formData.has(field.id);
      if (field.required && !checked) return { error: `"${field.label}" es obligatorio.` };
      data[field.id] = checked;
      emailLines.push(`${field.label}: ${checked ? "Sí" : "No"}`);
      continue;
    }
    const raw = sanitizePlainText(String(formData.get(field.id) ?? "")).slice(0, 5000);
    if (field.required && !raw) return { error: `"${field.label}" es obligatorio.` };
    if (field.fieldType === "email" && raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return { error: `"${field.label}" no es un email válido.` };
    }
    data[field.id] = raw;
    emailLines.push(`${field.label}: ${raw || "(vacío)"}`);
  }

  await prisma.formSubmission.create({ data: { formId, pageId, data } });

  const comms = await getCommunicationSettings();
  const replyToField = form.fields.find((f) => f.fieldType === "email");
  const replyTo = replyToField ? String(data[replyToField.id] ?? "") || undefined : undefined;
  await sendMail({
    to: form.destinationEmail || comms.contactFormDestinationEmail,
    subject: `Nuevo envío: ${form.name}`,
    text: emailLines.join("\n"),
    replyTo,
  });

  return { success: true };
}
