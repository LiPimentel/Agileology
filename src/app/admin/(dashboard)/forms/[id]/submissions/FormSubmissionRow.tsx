"use client";

import { InboxRow } from "@/app/admin/(dashboard)/inbox/InboxRow";
import { markFormSubmissionRead, deleteFormSubmission } from "../../actions";

export function FormSubmissionRow({
  submission,
  fields,
}: {
  submission: { id: string; data: Record<string, unknown>; status: "new" | "read"; submittedAt: string };
  fields: Array<{ id: string; label: string; fieldType: string }>;
}) {
  return (
    <InboxRow
      status={submission.status}
      onMarkRead={() => markFormSubmissionRead(submission.id)}
      onDelete={() => deleteFormSubmission(submission.id)}
    >
      <dl className="space-y-1">
        {fields.map((field) => {
          const value = submission.data[field.id];
          return (
            <div key={field.id} className="flex gap-2">
              <dt className="shrink-0 font-medium text-slate-900 dark:text-slate-100">{field.label}:</dt>
              <dd>{field.fieldType === "checkbox" ? (value ? "Sí" : "No") : String(value ?? "") || "(vacío)"}</dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{new Date(submission.submittedAt).toLocaleString("es")}</p>
    </InboxRow>
  );
}
