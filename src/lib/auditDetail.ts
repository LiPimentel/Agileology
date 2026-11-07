/** Pure helpers for audit-log details (no server-only imports: also used by the admin screen). */

export type AuditChange = { field: string; from: string; to: string };
export type AuditDetail = { entity?: string; summary?: string; changes?: AuditChange[] };

const MAX_VALUE = 200;
const MAX_CHANGES = 60;

/** Human-readable, bounded text for any value. */
export function fmt(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.length ? v.map((x) => fmt(x)).join(", ") : "—";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > MAX_VALUE ? `${s.slice(0, MAX_VALUE)}…` : s;
}

/** Only the fields whose value changed, with their Spanish label. */
export function diffFields(labels: Record<string, string>, before: Record<string, unknown>, after: Record<string, unknown>): AuditChange[] {
  const out: AuditChange[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const a = before[key];
    const b = after[key];
    const same = a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    if (!same) out.push({ field: label, from: fmt(a), to: fmt(b) });
  }
  return out;
}

export type BlockLike = {
  type: string;
  content: unknown;
  position?: number;
  columnIndex?: number;
  blockOrder?: number;
  [k: string]: unknown;
};

const TYPE_LABELS: Record<string, string> = {
  text: "Texto",
  image: "Imagen",
  link: "Enlace",
  video: "Video",
  map: "Mapa",
  contactForm: "Formulario de contacto",
  customForm: "Formulario",
  carousel: "Carrusel",
  latestPosts: "Entradas recientes",
};

/** Short description of what a block shows, for before/after lines. */
export function blockPreview(b: BlockLike): string {
  const c = (b.content ?? {}) as Record<string, unknown>;
  switch (b.type) {
    case "text":
      return fmt(String(c.html ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
    case "image":
      return fmt(c.altText || String(c.url ?? "").split("/").pop());
    case "link":
      return fmt(`${c.label ?? ""} → ${c.href ?? ""}`);
    case "video":
      return fmt(c.url);
    case "map":
      return fmt(c.address);
    case "carousel":
      return `${Array.isArray(c.slides) ? c.slides.length : 0} diapositivas`;
    case "latestPosts":
      return `${c.count ?? 5} entradas`;
    default:
      return fmt(c.formId ?? "");
  }
}

const slot = (b: BlockLike) => `${b.position ?? 0}:${b.columnIndex ?? 0}:${b.blockOrder ?? 0}`;
const place = (b: BlockLike) => `${TYPE_LABELS[b.type] ?? b.type} (sección ${(b.position ?? 0) + 1}, columna ${(b.columnIndex ?? 0) + 1})`;
const sig = (b: BlockLike) => JSON.stringify({ ...b, id: undefined, pageId: undefined, postId: undefined });

/** What happened to a page/post's blocks: counts plus the first modified/added/removed ones. */
export function diffBlocks(before: BlockLike[], after: BlockLike[]): { summary: string; changes: AuditChange[] } {
  const b = new Map(before.map((x) => [slot(x), x]));
  const a = new Map(after.map((x) => [slot(x), x]));
  const changes: AuditChange[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  for (const [k, nb] of a) {
    const ob = b.get(k);
    if (!ob) {
      added++;
      changes.push({ field: `Bloque añadido: ${place(nb)}`, from: "—", to: blockPreview(nb) });
    } else if (sig(ob) !== sig(nb)) {
      modified++;
      changes.push({ field: `Bloque modificado: ${place(nb)}`, from: blockPreview(ob), to: blockPreview(nb) });
    }
  }
  for (const [k, ob] of b) {
    if (!a.has(k)) {
      removed++;
      changes.push({ field: `Bloque eliminado: ${place(ob)}`, from: blockPreview(ob), to: "—" });
    }
  }
  const parts = [added && `${added} añadido${added > 1 ? "s" : ""}`, modified && `${modified} modificado${modified > 1 ? "s" : ""}`, removed && `${removed} eliminado${removed > 1 ? "s" : ""}`].filter(Boolean);
  return { summary: parts.length ? `Bloques: ${parts.join(", ")} (de ${before.length} a ${after.length})` : "", changes };
}

/** Bounded text: one audit row can never grow without limit, whatever an admin types. */
export const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function capChanges(changes: AuditChange[]): AuditChange[] {
  const bounded = changes.map((c) => ({ field: clip(c.field, 200), from: clip(c.from, 600), to: clip(c.to, 600) }));
  if (bounded.length <= MAX_CHANGES) return bounded;
  return [...bounded.slice(0, MAX_CHANGES), { field: "…", from: "", to: `y ${bounded.length - MAX_CHANGES} cambios más` }];
}

/** Old rows hold plain text (or nothing); new ones hold JSON. */
export function parseAuditDetail(raw: string | null | undefined): AuditDetail & { text?: string } {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object") return v as AuditDetail;
  } catch {
    // plain text from before details existed
  }
  return { text: raw };
}

export const ACTION_LABELS: Record<string, string> = {
  login: "Inició sesión",
  login_failed: "Intento de acceso fallido",
  logout: "Cerró sesión",
  enable_2fa: "Activó la verificación en dos pasos",
  reset_password: "Restableció su contraseña",
  create_page: "Creó una página",
  save_draft: "Guardó un borrador",
  publish_page: "Publicó una página",
  delete_page: "Eliminó una página",
  duplicate_page: "Duplicó una página",
  restore_version: "Restauró una versión",
  create_post: "Creó una entrada",
  publish_post: "Publicó una entrada",
  delete_post: "Eliminó una entrada",
  update_site_settings: "Cambió los ajustes del sitio",
  update_menu: "Cambió el menú del sitio",
  update_blog_settings: "Cambió el diseño del blog",
  update_communication_settings: "Cambió las comunicaciones",
  upload_media: "Subió un archivo",
  delete_media: "Eliminó un archivo",
  create_form: "Creó un formulario",
  save_form: "Guardó un formulario",
  delete_form: "Eliminó un formulario",
  mark_read: "Marcó como leído",
  delete: "Eliminó un mensaje",
};

export const ENTITY_LABELS: Record<string, string> = {
  Admin: "Cuenta",
  Page: "Página",
  Post: "Entrada",
  SiteSettings: "Ajustes del sitio",
  MenuItem: "Menú",
  BlogSettings: "Blog",
  CommunicationSettings: "Comunicaciones",
  Media: "Medios",
  FormDefinition: "Formulario",
  FormSubmission: "Envío de formulario",
  ChatMessage: "Mensaje de chat",
  ContactFormSubmission: "Mensaje de contacto",
};
