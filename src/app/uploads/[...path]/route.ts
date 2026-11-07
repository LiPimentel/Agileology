import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
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
  if (start >= size) return "invalid";
  if (start > end) return null; // syntactically valid but inverted: ignore the header and serve the whole file
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
    const filePath = path.join(UPLOAD_DIR, filename);
    const { size } = await stat(filePath);
    // Streamed from disk (never loaded whole into memory), so many concurrent requests for a
    // large video cannot exhaust memory.
    const body = (start?: number, end?: number) =>
      Readable.toWeb(createReadStream(filePath, start === undefined ? {} : { start, end })) as unknown as ReadableStream;
    const headers = {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Accept-Ranges": "bytes",
      // Uploaded files are only ever images/videos: never let a browser sniff or run them as a page.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    };
    const range = parseRange(req.headers.get("range"), size);
    if (range === "invalid") {
      return new NextResponse(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${size}` } });
    }
    if (range) {
      return new NextResponse(body(range.start, range.end), {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${range.start}-${range.end}/${size}`, "Content-Length": String(range.end - range.start + 1) },
      });
    }
    return new NextResponse(body(), { headers: { ...headers, "Content-Length": String(size) } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
