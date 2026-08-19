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
  const name = sanitizePlainText(String(formData.get("name") ?? "")).slice(0, 200);
  const email = sanitizePlainText(String(formData.get("email") ?? "")).slice(0, 200);
  const message = sanitizePlainText(String(formData.get("message") ?? "")).slice(0, 5000);

  if (!name || !email || !message) return { error: "Completa todos los campos requeridos." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email inválido." };

  await prisma.contactFormSubmission.create({
    data: { pageId, name, email, message },
  });

  const comms = await getCommunicationSettings();
  await sendMail({
    to: comms.contactFormDestinationEmail,
    subject: `Nuevo mensaje de contacto de ${name}`,
    text: `Nombre: ${name}\nEmail: ${email}\n\n${message}`,
    replyTo: email,
  });

  return { success: true };
}
