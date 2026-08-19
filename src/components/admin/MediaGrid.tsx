"use client";

import Image from "next/image";
import { deleteMedia } from "@/lib/actions/media";

export type MediaItem = { id: string; url: string; altText: string | null };

export function MediaGrid({ items, onSelect }: { items: MediaItem[]; onSelect?: (item: MediaItem) => void }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No hay imágenes todavía.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6">
      {items.map((item) => (
        <div key={item.id} className="group relative overflow-hidden rounded-md border border-slate-200">
          <button
            type="button"
            onClick={() => onSelect?.(item)}
            className={onSelect ? "block w-full cursor-pointer" : "block w-full cursor-default"}
          >
            <Image
              src={item.url}
              alt={item.altText ?? ""}
              width={200}
              height={200}
              unoptimized
              className="aspect-square w-full object-cover"
            />
          </button>
          {!onSelect && (
            <button
              type="button"
              onClick={() => {
                if (confirm("¿Eliminar esta imagen?")) deleteMedia(item.id);
              }}
              className="absolute right-1 top-1 hidden rounded bg-red-600 px-2 py-1 text-xs text-white group-hover:block"
            >
              Eliminar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
