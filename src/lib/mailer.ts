import "server-only";
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 465),
    secure: Number(SMTP_PORT ?? 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
  return transporter;
}

/**
 * Never throws: chat/contact submissions must be stored successfully even
 * if outbound email fails (RF-34) — a misconfigured or temporarily-down
 * SMTP server should not lose a visitor's message.
 */
export async function sendMail(opts: { to: string; subject: string; text: string; replyTo?: string }) {
  const t = getTransporter();
  if (!t) {
    console.warn("[mailer] SMTP not configured; skipping email send:", opts.subject);
    return { sent: false };
  }
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      replyTo: opts.replyTo,
    });
    return { sent: true };
  } catch (err) {
    console.error("[mailer] Failed to send email:", err instanceof Error ? err.message : err);
    return { sent: false };
  }
}
