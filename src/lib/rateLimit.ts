import "server-only";

/**
 * Lightweight in-memory fixed-window rate limiter for public endpoints
 * (chat, contact form, login) — RS-02, 7.8, RS-14 (app-level layer; real
 * bot/DDoS mitigation belongs at the hosting/CDN layer, see SECURITY.md).
 *
 * In-memory means limits are per Node process. Fine for a single-instance
 * deployment; move to a shared store (Redis) if scaled horizontally.
 * Expired buckets are swept regularly so the map cannot grow without bound
 * under a flood of distinct keys.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;
const SWEEP_EVERY_MS = 60_000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_EVERY_MS && buckets.size < MAX_BUCKETS) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k);
  // Still over the cap (every entry is live): drop the oldest rather than grow.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** true if `key` was already seen within `ttlMs` (and remembers it otherwise): one-time values such as 2FA codes. */
export function seenRecently(key: string, ttlMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(`seen:${key}`);
  if (b && b.resetAt >= now) return true;
  buckets.set(`seen:${key}`, { count: 1, resetAt: now + ttlMs });
  return false;
}
