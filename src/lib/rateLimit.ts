import "server-only";

/**
 * Lightweight in-memory fixed-window rate limiter for public endpoints
 * (chat, contact form, login) — RS-02, 7.8, RS-14 (app-level layer; real
 * bot/DDoS mitigation belongs at the hosting/CDN layer, see SECURITY.md).
 *
 * In-memory means limits are per Node process. Fine for a single-instance
 * deployment; move to a shared store (Redis) if scaled horizontally.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
