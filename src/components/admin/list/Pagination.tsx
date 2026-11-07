import Link from "next/link";
import { buildQuery } from "@/lib/listFilters";

/** "Mostrando 1–25 de 140" plus previous/next and numbered links (with gaps), keeping all filters. */
export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const href = (p: number) => `${basePath}${buildQuery(params, { page: p > 1 ? String(p) : undefined })}`;

  // 1 … current-1 current current+1 … last
  const shown = Array.from(new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages))).sort((a, b) => a - b);
  const link = "rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800";

  return (
    <nav aria-label="Paginación" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-400">
      <p role="status">{total === 0 ? "Sin resultados." : `Mostrando ${from}–${to} de ${total}`}</p>
      {pages > 1 && (
        <ul className="flex flex-wrap items-center gap-1">
          <li>{page > 1 ? <Link href={href(page - 1)} className={link} rel="prev">‹ Anterior</Link> : null}</li>
          {shown.map((p, i) => (
            <li key={p} className="flex items-center gap-1">
              {i > 0 && p - shown[i - 1] > 1 && <span aria-hidden="true">…</span>}
              {p === page ? (
                <span aria-current="page" className="rounded-md bg-violet-700 px-3 py-1.5 text-white dark:bg-violet-600">{p}</span>
              ) : (
                <Link href={href(p)} className={link} aria-label={`Página ${p}`}>{p}</Link>
              )}
            </li>
          ))}
          <li>{page < pages ? <Link href={href(page + 1)} className={link} rel="next">Siguiente ›</Link> : null}</li>
        </ul>
      )}
    </nav>
  );
}
