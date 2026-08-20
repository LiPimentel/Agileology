import "server-only";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// image/avif was missing here -- every image exported from the client's
// old Wix media library is a .avif file (Wix's own naming convention,
// e.g. "..._mv2.avif"), so uploads of exactly the images she'd actually be
// migrating were silently rejected. sharp/libvips decodes and re-encodes
// AVIF fine in this build (verified: sharp(buf).avif() round-trips), so
// this was purely an app-level allowlist gap, not a real codec limitation.
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_WIDTH = 1920;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/**
 * Validates and processes an uploaded image file (RS-07, 7.10):
 * - server-side MIME + size allowlist check (never trusts the browser alone)
 * - re-decodes the bytes with sharp, which throws on anything that isn't a
 *   genuine image, catching disguised/malicious file uploads
 * - resizes to a sane max width and compresses to webp
 */
export async function saveUploadedImage(file: File) {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Tipo de archivo no compatible. Usa JPEG, PNG, WebP, AVIF o GIF.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("El archivo es demasiado grande (máximo 10MB).");
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());
  const image = sharp(inputBuffer, { animated: file.type === "image/gif" || file.type === "image/avif" });
  let metadata;
  try {
    metadata = await image.metadata(); // throws if not a real image
  } catch {
    throw new Error("No se pudo leer la imagen -- el archivo puede estar dañado o no ser una imagen real.");
  }

  const isAnimated = (metadata.pages ?? 1) > 1;
  const resized = image.resize({ width: MAX_WIDTH, withoutEnlargement: true });

  let outputBuffer: Buffer;
  let ext: string;
  let mimeType: string;
  if (isAnimated) {
    outputBuffer = await resized.webp({ quality: 80 }).toBuffer();
    ext = "webp";
    mimeType = "image/webp";
  } else {
    outputBuffer = await resized.webp({ quality: 82 }).toBuffer();
    ext = "webp";
    mimeType = "image/webp";
  }

  const outMeta = await sharp(outputBuffer).metadata();
  const filename = `${randomUUID()}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, filename), outputBuffer);

  return {
    url: `/uploads/${filename}`,
    filename,
    mimeType,
    size: outputBuffer.length,
    width: outMeta.width ?? null,
    height: outMeta.height ?? null,
  };
}
