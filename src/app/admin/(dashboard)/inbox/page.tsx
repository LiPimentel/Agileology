import { prisma } from "@/lib/prisma";
import { ChatMessageRow } from "./ChatMessageRow";
import { ContactSubmissionRow } from "./ContactSubmissionRow";

export const metadata = { title: "Bandeja de entrada — Backoffice" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const [chatMessages, submissions] = await Promise.all([
    prisma.chatMessage.findMany({ orderBy: { receivedAt: "desc" } }),
    prisma.contactFormSubmission.findMany({ orderBy: { submittedAt: "desc" } }),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bandeja de entrada</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Chat del sitio</h2>
        <div className="space-y-3">
          {chatMessages.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Sin mensajes.</p>}
          {chatMessages.map((m) => (
            <ChatMessageRow key={m.id} message={{ ...m, receivedAt: m.receivedAt.toISOString() }} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">Formulario de contacto</h2>
        <div className="space-y-3">
          {submissions.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Sin mensajes.</p>}
          {submissions.map((s) => (
            <ContactSubmissionRow key={s.id} submission={{ ...s, submittedAt: s.submittedAt.toISOString() }} />
          ))}
        </div>
      </section>
    </div>
  );
}
