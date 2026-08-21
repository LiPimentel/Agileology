"use client";

export type ContactFormBlockValue = { enabledFields: Array<"name" | "email" | "message"> };

const FIELDS: Array<{ key: "name" | "email" | "message"; label: string }> = [
  { key: "name", label: "Nombre" },
  { key: "email", label: "Email" },
  { key: "message", label: "Mensaje" },
];

export function ContactFormBlockEditor({
  value,
  onChange,
}: {
  value: ContactFormBlockValue;
  onChange: (value: ContactFormBlockValue) => void;
}) {
  function toggle(field: "name" | "email" | "message") {
    const has = value.enabledFields.includes(field);
    onChange({ enabledFields: has ? value.enabledFields.filter((f) => f !== field) : [...value.enabledFields, field] });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-700">Campos del formulario</p>
      <div className="flex gap-4 text-sm text-slate-700">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-1">
            <input type="checkbox" checked={value.enabledFields.includes(f.key)} onChange={() => toggle(f.key)} />
            {f.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-500">Los envíos llegan al correo configurado en Comunicaciones.</p>
    </div>
  );
}
