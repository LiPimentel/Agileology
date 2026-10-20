// Plain constants shared between server code (lib/forms.ts, the public
// CustomFormRenderer) and client code (FormEditorForm.tsx) -- deliberately
// has no "server-only" import (unlike lib/forms.ts) so a "use client" file
// can import it too.
export type FormFieldType = "text" | "email" | "tel" | "textarea" | "select" | "checkbox";

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Texto corto",
  email: "Email",
  tel: "Teléfono",
  textarea: "Texto largo",
  select: "Lista desplegable",
  checkbox: "Casilla (sí/no)",
};
