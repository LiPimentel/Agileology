"use client";

import { InboxRow } from "./InboxRow";
import { markChatRead, deleteChatMessage } from "./actions";

export function ChatMessageRow({
  message,
}: {
  message: { id: string; visitorName: string | null; visitorEmail: string | null; message: string; status: "new" | "read"; receivedAt: string };
}) {
  return (
    <InboxRow status={message.status} onMarkRead={() => markChatRead(message.id)} onDelete={() => deleteChatMessage(message.id)}>
      <p className="font-medium text-slate-900">
        {message.visitorName ?? "Anónimo"} {message.visitorEmail && <span className="font-normal text-slate-500">· {message.visitorEmail}</span>}
      </p>
      <p className="mt-1">{message.message}</p>
      <p className="mt-1 text-xs text-slate-400">{new Date(message.receivedAt).toLocaleString("es")}</p>
    </InboxRow>
  );
}
