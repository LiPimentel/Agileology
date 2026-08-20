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

// Deliberately OUTSIDE `public/` -- with `next start`, files written to
// public/uploads after the build do get served fine, but the moment a
// Docker rebuild replaces the container (exactly the deploy loop this
// project uses: git pull -> docker compose build -> up -d), anything
// written into the previous container's filesystem is gone, since it was
// never part of the image or a mounted volume. Configurable via
// UPLOADS_DIR so the docker-compose volume mount has one unambiguous
// target; defaults to a project-relative "uploads" dir for local/non-
// Docker dev. Serving is handled by src/app/uploads/[...path]/route.ts,
// not Next's static /public pipeline (also sidesteps the standalone-
// output "public/ is only a build-time snapshot" gotcha, if that mode
// ever gets turned on for this project).
export const UPLOAD_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");

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
  const ext = "webp";
  const mimeType = "image/webp";
  if (isAnimated) {
    outputBuffer = await resized.webp({ quality: 80 }).toBuffer();
  } else {
    outputBuffer = await resized.webp({ quality: 82 }).toBuffer();
  }

  const outMeta = await sharp(outputBuffer).metadata();
  const filename = `${randomUUID()}.${ext}`;

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, filename);
  await writeFile(filePath, outputBuffer);

  // Written files should never be silently wrong/empty -- verify instead
  // of trusting writeFile() not throwing (e.g. a volume mounted read-only
  // or nearly full can behave unexpectedly across different filesystems).
  const { stat } = await import("node:fs/promises");
  const written = await stat(filePath).catch(() => null);
  if (!written || written.size !== outputBuffer.length) {
    throw new Error("La imagen se procesó pero no se pudo guardar en disco correctamente.");
  }

  return {
    url: `/uploads/${filename}`,
    filename,
    mimeType,
    size: outputBuffer.length,
    width: outMeta.width ?? null,
    height: outMeta.height ?? null,
  };
}
