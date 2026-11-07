import Link from "next/link";
import { buildQuery } from "@/lib/listFilters";

/** Table header that sorts the list by `field`; clicking again reverses it. Announces the order via aria-sort. */
export function SortableTh({
  label,
  field,
  sort,
  dir,
  basePath,
  params,
}: {
  label: string;
  field: string;
  sort: string;
  dir: "asc" | "desc";
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const active = sort === field;
  const nextDir = active && dir === "asc" ? "desc" : "asc";
  return (
    <th scope="col" className="px-4 py-3" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <Link href={`${basePath}${buildQuery(params, { sort: field, dir: nextDir, page: undefined })}`} className="inline-flex items-center gap-1 hover:text-violet-700 dark:hover:text-sky-400">
        {label}
        <span aria-hidden="true">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
        <span className="sr-only">{active ? `, orden ${dir === "asc" ? "ascendente" : "descendente"}` : ", ordenar"}</span>
      </Link>
    </th>
  );
}
