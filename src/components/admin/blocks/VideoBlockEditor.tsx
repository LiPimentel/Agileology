"use client";

import { parseVideoEmbed } from "@/lib/video";

export function VideoBlockEditor({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const embed = url ? parseVideoEmbed(url) : null;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">URL de YouTube o Vimeo</label>
        <input
          value={url}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </div>
      {url && !embed && <p className="text-sm text-amber-600">No se reconoce como enlace de YouTube o Vimeo.</p>}
      {embed && (
        <div className="aspect-video max-w-md overflow-hidden rounded-md">
          <iframe
            src={embed.embedUrl}
            className="h-full w-full"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            title="Previsualización de video"
          />
        </div>
      )}
    </div>
  );
}
