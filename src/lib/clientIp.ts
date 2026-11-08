import "server-only";
import { isIP } from "node:net";

type HeaderReader = { get(name: string): string | null };

const valid = (v: string | null | undefined): v is string => Boolean(v) && isIP(v!.trim()) !== 0;

/**
 * The visitor's IP, for rate limiting and audit entries.
 *
 * "X-Forwarded-For" is just a header: anyone can send one with a made-up address, which would let
 * a bot dodge every per-IP limit. So when the site sits behind a proxy you control, set
 * TRUSTED_IP_HEADER to the header that proxy fills in itself (Cloudflare: "cf-connecting-ip"):
 * only that header is believed, and if it is missing the caller is treated as "unknown" instead
 * of trusting a forgeable one. Without it, the first address of X-Forwarded-For is used
 * (fine while testing, e.g. behind Tailscale, where no one can reach the app directly).
 */
let warned = false;

export function clientIp(headers: HeaderReader): string {
  const trusted = process.env.TRUSTED_IP_HEADER?.trim().toLowerCase();
  if (!trusted && !warned && process.env.NODE_ENV === "production" && (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://")) {
    warned = true;
    console.warn("[seguridad] El sitio es público (https) pero TRUSTED_IP_HEADER no está definida: los límites por IP se pueden evadir con un X-Forwarded-For falso. Con Cloudflare: TRUSTED_IP_HEADER=cf-connecting-ip");
  }
  if (trusted) {
    const v = headers.get(trusted)?.trim();
    return valid(v) ? v : "unknown";
  }
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (valid(first)) return first;
  const real = headers.get("x-real-ip")?.trim();
  return valid(real) ? real : "unknown";
}
