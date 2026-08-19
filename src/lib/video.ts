const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/;
const VIMEO_RE = /vimeo\.com\/(\d+)/;

/** Client-safe (no server-only deps) so it can run in the block editor UI too. */
export function parseVideoEmbed(url: string): { provider: "youtube" | "vimeo"; embedUrl: string } | null {
  const yt = url.match(YOUTUBE_RE);
  if (yt) return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vimeo = url.match(VIMEO_RE);
  if (vimeo) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  return null;
}
