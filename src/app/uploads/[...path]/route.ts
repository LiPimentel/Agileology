import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/image";

// Serves uploaded media from UPLOAD_DIR directly, instead of relying on
// Next's static /public pipeline -- see the comment on UPLOAD_DIR
// (src/lib/image.ts) for why: a Docker rebuild wipes anything written into
// public/ at runtime unless it's a mounted volume, and this project's
// deploy loop is exactly "git pull -> docker compose build -> up -d" every
// time, silently losing every previously-uploaded image. Point the
// docker-compose volume at UPLOAD_DIR (i.e. the UPLOADS_DIR env var, or
// its default) and uploads survive rebuilds regardless of build mode.
//
// Content type is derived from a small fixed allowlist of extensions, never
// from the request -- saveUploadedImage() always converts to webp, and
// saveUploadedVideo() (background videos) only ever writes mp4/webm, so
// every file this serves is one of exactly these, by construction (not an
// arbitrary extension that could otherwise be used to probe the
// filesystem).
const MIME_BY_EXT: Record<string, string> = { webp: "image/webp", mp4: "video/mp4", webm: "video/webm" };

/**
 * Parses a single "Range: bytes=a-b" header against a file of `size` bytes. Returns null when
 * there is no (usable) range -- the whole file is then served -- or "invalid" when it cannot be
 * satisfied. Safari will not play a <video> unless the server answers ranges with 206.
 */
function parseRange(header: string | null, size: number): { start: number; end: number } | "invalid" | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null; // not a single simple range: ignore it
  let start: number;
  let end: number;
  if (m[1] === "") {
    const suffix = Number(m[2]);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return "invalid";
  return { start, end };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  // A single, flat filename only -- reject anything with path traversal
  // segments or that isn't exactly one segment (uploads are never nested).
  if (segments.length !== 1 || segments[0].includes("..") || segments[0].includes("/")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const filename = segments[0];
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const data = await readFile(path.join(UPLOAD_DIR, filename));
    const headers = {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
    };
    const range = parseRange(req.headers.get("range"), data.length);
    if (range === "invalid") {
      return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${data.length}` } });
    }
    if (range) {
      const chunk = data.subarray(range.start, range.end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${range.start}-${range.end}/${data.length}`, "Content-Length": String(chunk.length) },
      });
    }
    return new NextResponse(new Uint8Array(data), { headers });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
