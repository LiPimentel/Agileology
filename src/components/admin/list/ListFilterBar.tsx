import Link from "next/link";

export type FilterField =
  | { type: "search"; name: string; label: string; placeholder?: string }
  | { type: "select"; name: string; label: string; options: Array<{ value: string; label: string }> }
  | { type: "date"; name: string; label: string };

const input = "mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

/**
 * GET form with the filters of a list. Plain HTML (no client code): submitting reloads the list
 * with the filters in the URL, so they can be bookmarked and shared. Sorting is kept through
 * hidden inputs; pagination restarts at page 1 on every new search.
 */
export function ListFilterBar({
  fields,
  values,
  resetHref,
  hidden = {},
  children,
}: {
  fields: FilterField[];
  values: Record<string, string>;
  resetHref: string;
  hidden?: Record<string, string | undefined>;
  children?: React.ReactNode;
}) {
  const active = fields.some((f) => Boolean(values[f.name]));
  return (
    <form method="get" role="search" aria-label="Filtros de la lista" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      {fields.map((f) => {
        const id = `filter-${f.name}`;
        return (
          <div key={f.name}>
            <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              {f.label}
            </label>
            {f.type === "select" ? (
              <select id={id} name={f.name} defaultValue={values[f.name] ?? ""} className={input}>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={f.name}
                type={f.type === "date" ? "date" : "search"}
                defaultValue={values[f.name] ?? ""}
                placeholder={f.type === "search" ? f.placeholder : undefined}
                className={`${input} ${f.type === "search" ? "w-56" : ""}`}
              />
            )}
          </div>
        );
      })}
      <button type="submit" className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 dark:bg-violet-600 dark:hover:bg-violet-500">
        Filtrar
      </button>
      {active && (
        <Link href={resetHref} className="text-sm text-slate-600 underline hover:text-violet-700 dark:text-slate-400 dark:hover:text-sky-400">
          Limpiar filtros
        </Link>
      )}
      {children}
    </form>
  );
}
