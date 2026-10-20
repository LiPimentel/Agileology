"use client";

import { MapEmbed } from "@/components/public/MapEmbed";

export type MapBlockValue = { address: string };

export function MapBlockEditor({ value, onChange }: { value: MapBlockValue; onChange: (value: MapBlockValue) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Dirección</label>
        <input
          value={value.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Zapopan, Jalisco, México"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
      {/* Real live preview -- the exact same component the public page renders. */}
      {value.address && <MapEmbed address={value.address} />}
    </div>
  );
}
