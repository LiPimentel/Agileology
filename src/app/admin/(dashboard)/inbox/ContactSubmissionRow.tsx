"use client";

import { InboxRow } from "./InboxRow";
import { markContactRead, deleteContactSubmission } from "./actions";

export function ContactSubmissionRow({
  submission,
}: {
  submission: { id: string; name: string; email: string; message: string; status: "new" | "read"; submittedAt: string };
}) {
  return (
    <InboxRow status={submission.status} onMarkRead={() => markContactRead(submission.id)} onDelete={() => deleteContactSubmission(submission.id)}>
      <p className="font-medium text-slate-900">
        {submission.name} <span className="font-normal text-slate-500">· {submission.email}</span>
      </p>
      <p className="mt-1">{submission.message}</p>
      <p className="mt-1 text-xs text-slate-400">{new Date(submission.submittedAt).toLocaleString("es")}</p>
    </InboxRow>
  );
}
