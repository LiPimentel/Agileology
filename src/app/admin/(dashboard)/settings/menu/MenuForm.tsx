"use client";

import { useActionState, useState } from "react";
import { saveMenuItems, type MenuFormState } from "./actions";

const initialState: MenuFormState = {};

type MenuItemDraft = {
  id: string;
  label: string;
  linkType: "page" | "url";
  pageId: string | null;
  externalUrl: string;
  newTab: boolean;
  visible: boolean;
  parentId: string | null;
};

function generateId() {
  // Same reasoning as elsewhere in the admin: crypto.randomUUID() needs a
  // secure context (HTTPS/localhost) and throws over plain HTTP.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function MenuForm({
  initialItems,
  pages,
}: {
  initialItems: MenuItemDraft[];
  pages: Array<{ id: string; title: string; slug: string }>;
}) {
  const [state, formAction, pending] = useActionState(saveMenuItems, initialState);
  const [items, setItems] = useState<MenuItemDraft[]>(initialItems);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: generateId(), label: "", linkType: "page", pageId: pages[0]?.id ?? null, externalUrl: "", newTab: false, visible: true, parentId: null },
    ]);
  }
  function removeItem(id: string) {
    setItems((prev) =>
      prev.filter((i) => i.id !== id).map((i) => (i.parentId === id ? { ...i, parentId: null } : i)),
    );
  }
  function moveItem(id: string, dir: -1 | 1) {
    setItems((prev) => {
      const i = prev.findIndex((it) => it.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function update(id: string, patch: Partial<MenuItemDraft>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  return (
    <form action={formAction} className="max-w-3xl space-y-4">
      <input
        type="hidden"
        name="itemsJson"
        value={JSON.stringify(
          items.map((i) => ({
            id: i.id,
            label: i.label,
            linkType: i.linkType,
            pageId: i.linkType === "page" ? i.pageId : null,
            externalUrl: i.linkType === "url" ? i.externalUrl : null,
            newTab: i.newTab,
            visible: i.visible,
            parentId: i.parentId,
          })),
        )}
        readOnly
      />

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`rounded-lg border border-slate-200 bg-white p-4 ${item.parentId ? "ml-8 border-l-4 border-l-violet-300" : ""}`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {item.parentId ? "↳ " : ""}Enlace {idx + 1}
              </span>
              <div className="flex gap-2 text-sm">
                <button type="button" disabled={idx === 0} onClick={() => moveItem(item.id, -1)} className="text-slate-500 hover:text-violet-700 disabled:opacity-30">
                  ↑
                </button>
                <button type="button" disabled={idx === items.length - 1} onClick={() => moveItem(item.id, 1)} className="text-slate-500 hover:text-violet-700 disabled:opacity-30">
                  ↓
                </button>
                <button type="button" onClick={() => removeItem(item.id)} className="text-red-600 hover:underline">
                  Eliminar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">Texto del menú</label>
                <input
                  value={item.label}
                  onChange={(e) => update(item.id, { label: e.target.value })}
                  placeholder="Ej: Nosotros"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Tipo de enlace</label>
                <select
                  value={item.linkType}
                  onChange={(e) => update(item.id, { linkType: e.target.value as "page" | "url" })}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  <option value="page">Página del sitio</option>
                  <option value="url">Enlace externo / URL</option>
                </select>
              </div>

              {item.linkType === "page" ? (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500">Página</label>
                  <select
                    value={item.pageId ?? ""}
                    onChange={(e) => update(item.id, { pageId: e.target.value })}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {pages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500">URL (https://... o /ruta-interna)</label>
                  <input
                    value={item.externalUrl}
                    onChange={(e) => update(item.id, { externalUrl: e.target.value })}
                    placeholder="https://www.instagram.com/tu-cuenta"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  />
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-700">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={item.newTab} onChange={(e) => update(item.id, { newTab: e.target.checked })} />
                Abrir en nueva pestaña
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={item.visible} onChange={(e) => update(item.id, { visible: e.target.checked })} />
                Visible en el menú
              </label>
              {/*
                Dropdown submenus: only items that are themselves top-level
                (no parentId) can be chosen as a parent -- one level of
                nesting only, otherwise a submenu could point at another
                submenu and the public dropdown would have nowhere to put
                the grandchildren.
              */}
              {/* Hidden for an item that's itself already a parent -- can't nest two levels deep. */}
              {!items.some((i) => i.parentId === item.id) &&
                items.filter((i) => i.id !== item.id && i.parentId === null).length > 0 && (
                <label className="flex items-center gap-2">
                  Submenú de:
                  <select
                    value={item.parentId ?? ""}
                    onChange={(e) => update(item.id, { parentId: e.target.value || null })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
                  >
                    <option value="">— Nivel superior —</option>
                    {items
                      .filter((i) => i.id !== item.id && i.parentId === null)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.label || "(sin texto)"}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        className="rounded-md border border-dashed border-violet-300 px-3 py-1.5 text-sm text-violet-700 hover:border-violet-500 hover:bg-violet-50"
      >
        + Agregar enlace
      </button>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && !state.error && <p className="text-sm text-green-700">Guardado.</p>}

      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-violet-700 px-5 py-2 font-medium text-white hover:bg-violet-800 disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Guardar menú"}
        </button>
      </div>
    </form>
  );
}
