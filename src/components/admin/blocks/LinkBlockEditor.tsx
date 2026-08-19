"use client";

export type LinkBlockValue = { label: string; href: string; internal: boolean; newTab: boolean };

export function LinkBlockEditor({
  value,
  onChange,
  pages,
}: {
  value: LinkBlockValue;
  onChange: (value: LinkBlockValue) => void;
  pages: Array<{ slug: string; title: string }>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">Texto del botón</label>
        <input
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.internal}
          onChange={(e) => onChange({ ...value, internal: e.target.checked, href: "" })}
        />
        Enlace interno (a otra página de este sitio)
      </label>
      {value.internal ? (
        <select
          value={value.href}
          onChange={(e) => onChange({ ...value, href: e.target.value })}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="">Selecciona una página</option>
          {pages.map((p) => (
            <option key={p.slug} value={p.slug === "home" ? "/" : `/${p.slug}`}>
              {p.title}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value.href}
          onChange={(e) => onChange({ ...value, href: e.target.value })}
          placeholder="https://..."
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
      )}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={value.newTab} onChange={(e) => onChange({ ...value, newTab: e.target.checked })} />
        Abrir en nueva pestaña
      </label>
    </div>
  );
}
