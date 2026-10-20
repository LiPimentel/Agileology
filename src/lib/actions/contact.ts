"use server";

import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { sendMail } from "@/lib/mailer";
import { getCommunicationSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/rateLimit";
import { headers } from "next/headers";

export type ContactFormState = { error?: string; success?: boolean };

/** RF-30–RF-34: stores the submission and emails the configured destination. */
export async function submitContactForm(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  // Honeypot field: real visitors never fill this hidden input (7.8, RS-14).
  if (String(formData.get("company") ?? "").trim()) {
    return { success: true };
  }

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`contact:${ip}`, 5, 60_000)) {
    return { error: "Demasiados envíos. Intenta de nuevo en un minuto." };
  }

  const pageId = String(formData.get("pageId") ?? "") || null;
  // ContactForm.tsx only renders the fields the admin enabled for this
  // block (enabledFields) -- a disabled field is never in the FormData at
  // all, so formData.has() distinguishes "this field isn't part of the
  // form" from "it's part of the form but was left empty". Without this,
  // disabling e.g. "Mensaje" made every submission fail with "completa
  // todos los campos requeridos", since the message field could never be
  // filled in.
  const name = formData.has("name") ? sanitizePlainText(String(formData.get("name") ?? "")).slice(0, 200) : "";
  const email = formData.has("email") ? sanitizePlainText(String(formData.get("email") ?? "")).slice(0, 200) : "";
  const message = formData.has("message") ? sanitizePlainText(String(formData.get("message") ?? "")).slice(0, 5000) : "";

  if ((formData.has("name") && !name) || (formData.has("email") && !email) || (formData.has("message") && !message)) {
    return { error: "Completa todos los campos requeridos." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido." };

  await prisma.contactFormSubmission.create({
    data: { pageId, name, email, message },
  });

  const comms = await getCommunicationSettings();
  await sendMail({
    to: comms.contactFormDestinationEmail,
    subject: name ? `Nuevo mensaje de contacto de ${name}` : "Nuevo mensaje de contacto",
    text: `Nombre: ${name || "(no incluido)"}\nEmail: ${email || "(no incluido)"}\n\n${message}`,
    replyTo: email || undefined,
  });

  return { success: true };
}
