import "server-only";
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOAD_DIR } from "@/lib/image";

// Background videos (section background "Video" tab) -- a real uploaded
// file, not just a YouTube/Vimeo embed (those are iframes, which can't be
// layered as a silent looping background the way VideoBlockEditor uses
// them for a normal video block). No transcoding here (no ffmpeg in this
// build) -- validated by extension/MIME only and written through as-is, so
// keep the size limit tight: this has to download and autoplay on every
// visit to a page using it.
const ALLOWED_MIME_TO_EXT: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };
const MAX_BYTES = 25 * 1024 * 1024; // 25MB -- background videos should be short/light

export async function saveUploadedVideo(file: File) {
  const ext = ALLOWED_MIME_TO_EXT[file.type];
  if (!ext) {
    throw new Error("Tipo de video no compatible. Usa MP4 o WebM.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("El video es demasiado grande (máximo 25MB) -- un video de fondo debe ser corto y liviano.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${randomUUID()}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, filename);
  await writeFile(filePath, buffer);

  const written = await stat(filePath).catch(() => null);
  if (!written || written.size !== buffer.length) {
    throw new Error("El video se subió pero no se pudo guardar en disco correctamente.");
  }

  return {
    url: `/uploads/${filename}`,
    filename,
    mimeType: file.type,
    size: buffer.length,
    width: null as number | null,
    height: null as number | null,
  };
}
