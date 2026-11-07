// Anchored to the start so a foreign URL that merely contains "youtube.com/watch?v=..." in its
// query string is not mistaken for a video link.
const YOUTUBE_RE = /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})(?![\w-])/;
const VIMEO_RE = /^(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)(?!\d)/;

/** Client-safe (no server-only deps) so it can run in the block editor UI too. */
export function parseVideoEmbed(rawUrl: string): { provider: "youtube" | "vimeo"; embedUrl: string } | null {
  const url = rawUrl.trim();
  const yt = url.match(YOUTUBE_RE);
  if (yt) return { provider: "youtube", embedUrl: `https://www.youtube-nocookie.com/embed/${yt[1]}` };
  const vimeo = url.match(VIMEO_RE);
  if (vimeo) return { provider: "vimeo", embedUrl: `https://player.vimeo.com/video/${vimeo[1]}` };
  return null;
}
