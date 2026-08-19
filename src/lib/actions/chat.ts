"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sanitizePlainText } from "@/lib/sanitize";
import { sendMail } from "@/lib/mailer";
import { getCommunicationSettings } from "@/lib/settings";
import { rateLimit } from "@/lib/rateLimit";

export type ChatFormState = { error?: string; success?: boolean };

/** RF-26–RF-29: stores the chat message and emails the configured destination. */
export async function submitChatMessage(_prev: ChatFormState, formData: FormData): Promise<ChatFormState> {
  // Honeypot (7.8, RS-14).
  if (String(formData.get("company") ?? "").trim()) return { success: true };

  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`chat:${ip}`, 8, 60_000)) {
    return { error: "Demasiados mensajes. Intenta de nuevo en un minuto." };
  }

  const message = sanitizePlainText(String(formData.get("message") ?? "")).slice(0, 3000);
  if (!message) return { error: "Escribe un mensaje." };
  const visitorName = sanitizePlainText(String(formData.get("visitorName") ?? "")).slice(0, 200) || null;
  const visitorEmail = sanitizePlainText(String(formData.get("visitorEmail") ?? "")).slice(0, 200) || null;

  await prisma.chatMessage.create({ data: { visitorName, visitorEmail, message } });

  const comms = await getCommunicationSettings();
  await sendMail({
    to: comms.chatDestinationEmail,
    subject: `Nuevo mensaje de chat${visitorName ? ` de ${visitorName}` : ""}`,
    text: `${visitorName ? `Nombre: ${visitorName}\n` : ""}${visitorEmail ? `Email: ${visitorEmail}\n` : ""}\n${message}`,
    replyTo: visitorEmail ?? undefined,
  });

  return { success: true };
}
