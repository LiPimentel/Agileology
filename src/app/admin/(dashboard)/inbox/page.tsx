import { prisma } from "@/lib/prisma";
import { ChatMessageRow } from "./ChatMessageRow";
import { ContactSubmissionRow } from "./ContactSubmissionRow";
import { ListFilterBar, type FilterField } from "@/components/admin/list/ListFilterBar";
import { Pagination } from "@/components/admin/list/Pagination";
import { PAGE_SIZE, dayRange, oneOf, pageNumber, pick, type SearchParams } from "@/lib/listFilters";

export const metadata = { title: "Bandeja de entrada — Backoffice" };
export const dynamic = "force-dynamic";

export default async function InboxPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = pick(sp.q);
  const status = oneOf(pick(sp.status), ["", "new", "read"] as const, "");
  const from = pick(sp.from);
  const to = pick(sp.to);
  const chatPage = pageNumber(sp.pc);
  const formPage = pageNumber(sp.pf);
  const range = dayRange(from, to);
  const text = (fields: string[]) => ({ OR: fields.map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) });

  const chatWhere = {
    ...(status ? { status } : {}),
    ...(range ? { receivedAt: range } : {}),
    ...(q ? text(["visitorName", "visitorEmail", "message"]) : {}),
  };
  const formWhere = {
    ...(status ? { status } : {}),
    ...(range ? { submittedAt: range } : {}),
    ...(q ? text(["name", "email", "message"]) : {}),
  };

  const [chatMessages, chatTotal, submissions, formTotal, unreadChat, unreadForm] = await Promise.all([
    prisma.chatMessage.findMany({ where: chatWhere, orderBy: { receivedAt: "desc" }, skip: (chatPage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.chatMessage.count({ where: chatWhere }),
    prisma.contactFormSubmission.findMany({ where: formWhere, orderBy: { submittedAt: "desc" }, skip: (formPage - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.contactFormSubmission.count({ where: formWhere }),
    prisma.chatMessage.count({ where: { status: "new" } }),
    prisma.contactFormSubmission.count({ where: { status: "new" } }),
  ]);

  const params = { q, status, from, to, pc: chatPage > 1 ? String(chatPage) : "", pf: formPage > 1 ? String(formPage) : "" };
  const values = { q, status, from, to };
  const fields: FilterField[] = [
    { type: "search", name: "q", label: "Buscar (nombre, correo o mensaje)", placeholder: "Texto..." },
    {
      type: "select",
      name: "status",
      label: "Estado",
      options: [
        { value: "", label: "Todos" },
        { value: "new", label: "Nuevos" },
        { value: "read", label: "Leídos" },
      ],
    },
    { type: "date", name: "from", label: "Desde" },
    { type: "date", name: "to", label: "Hasta" },
  ];
  const noMatch = "Ningún mensaje coincide con los filtros.";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Bandeja de entrada</h1>
      <p className="text-sm text-slate-600 dark:text-slate-400" role="status">
        Sin leer: {unreadChat} en el chat y {unreadForm} en el formulario de contacto.
      </p>

      <ListFilterBar fields={fields} values={values} resetHref="/admin/inbox" />

      <section aria-labelledby="inbox-chat">
        <h2 id="inbox-chat" className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
          Chat del sitio ({chatTotal})
        </h2>
        <div className="space-y-3">
          {chatMessages.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">{q || status || range ? noMatch : "Sin mensajes."}</p>}
          {chatMessages.map((m) => (
            <ChatMessageRow key={m.id} message={{ ...m, receivedAt: m.receivedAt.toISOString() }} />
          ))}
        </div>
        <Pagination basePath="/admin/inbox" params={params} page={chatPage} pageSize={PAGE_SIZE} total={chatTotal} pageKey="pc" label="Paginación del chat" />
      </section>

      <section aria-labelledby="inbox-form">
        <h2 id="inbox-form" className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
          Formulario de contacto ({formTotal})
        </h2>
        <div className="space-y-3">
          {submissions.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">{q || status || range ? noMatch : "Sin mensajes."}</p>}
          {submissions.map((s) => (
            <ContactSubmissionRow key={s.id} submission={{ ...s, submittedAt: s.submittedAt.toISOString() }} />
          ))}
        </div>
        <Pagination basePath="/admin/inbox" params={params} page={formPage} pageSize={PAGE_SIZE} total={formTotal} pageKey="pf" label="Paginación del formulario de contacto" />
      </section>
    </div>
  );
}
