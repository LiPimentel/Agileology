# Security

This maps PRD section 8 (security requirements) to what's implemented in
code versus what's a deployment/hosting decision.

## Implemented in the application

| ID | Requirement | Where |
|----|-------------|-------|
| RS-01 | Passwords hashed with bcrypt, never stored/reversible | `src/lib/auth.ts` (`hashPassword`, cost factor 12) |
| RS-02 | Login rate-limiting + lockout after repeated failures | `src/lib/rateLimit.ts`, `recordFailedLogin`/`isLockedOut` in `src/lib/auth.ts` (5 attempts → 15 min lockout) |
| RS-03 | Mandatory 2FA (TOTP), not just email+password | `src/app/admin/setup-2fa/`, `src/app/admin/login/2fa/` — enrollment is forced before any other backoffice page is reachable |
| RS-04 | Session cookies HttpOnly, Secure, SameSite | `src/lib/session-db.ts` (`sessionCookieOptions`) |
| RS-05 | CSRF protection on all state-changing backoffice actions | All mutations are Next.js Server Actions, which reject cross-origin submissions by comparing the `Origin`/`Host` headers — no hand-rolled token needed |
| RS-06 | Sanitize all rich text / user input before render (stored XSS) | `src/lib/sanitize.ts`, applied to every content block (`sanitizeBlockContent`) and every chat/contact field |
| RS-07 | Server-side file type/size validation on upload | `src/lib/image.ts` (`saveUploadedImage`): MIME allowlist, size cap, and a real re-decode with `sharp` so a disguised non-image file fails outright |
| RS-08 | Video embeds sandboxed | `src/components/blocks/BlockRenderer.tsx` — `<iframe sandbox="...">` restricted to YouTube/Vimeo URLs parsed by `src/lib/video.ts` |
| RS-09 | Parameterized queries / ORM | Prisma throughout; no raw SQL string interpolation anywhere |
| RS-10 | Audit log of every content-changing action | `src/lib/audit.ts` (`logAudit`), called from every admin mutation; viewer at `/admin/settings/audit` |
| RS-15 | Admin can delete chat/contact submissions (right-to-erasure) | `/admin/inbox`, `deleteChatMessage` / `deleteContactSubmission` |
| 7.8 (spam) | Honeypot + rate limiting on chat/contact | `src/lib/actions/chat.ts`, `src/lib/actions/contact.ts` |
| 7.10 (image opt.) | Compression/resize on upload | `src/lib/image.ts` (resize to max 1920px, webp re-encode) |

## Deployment-level (not expressible as application code)

These need to be configured wherever the app is actually hosted:

- **RS-11 — Encrypted, access-restricted backups.** Set up automatic
  backups for the PostgreSQL database (most managed Postgres providers —
  Neon, Supabase, RDS — offer this) and restrict who can access them.
- **RS-12 — SPF, DKIM, DMARC** for the sending domain, so chat/contact
  emails aren't marked as spam and the domain can't be spoofed. Configure
  these DNS records for whichever address `SMTP_FROM` uses.
- **RS-13 — Secrets as environment variables.** Already followed in code
  (`.env`, never committed — see `.gitignore`); when deploying, set the
  same variables in the host's secret/environment configuration, not in
  source.
- **RS-14 — Bot/DDoS mitigation.** The app has application-level rate
  limiting (RS-02, 7.8), but real DDoS/bot protection belongs at the
  hosting/CDN layer (e.g. Cloudflare, or your host's built-in protection)
  in front of the chat and contact-form endpoints.
- **RS-16 — Retention guideline.** No automatic deletion is implemented;
  decide how long to keep `ChatMessage`, `ContactFormSubmission`, and
  `VisitLog` rows and either document it as policy or add a scheduled
  cleanup job later.
- **HTTPS.** Automatic on most modern hosts (e.g. Vercel, or Caddy/Nginx
  with Let's Encrypt on a VPS) — verify it's actually enforced before
  go-live.
- **Admin subdomain DNS.** `admin.agileologywave.com` needs a DNS record
  pointing at the deployment; the app already handles the routing (see
  `src/proxy.ts`).

## Notes on the in-memory rate limiter

`src/lib/rateLimit.ts` is a per-process in-memory limiter. That's correct
for a single-instance deployment; if the app ever runs on multiple
instances behind a load balancer, move it to a shared store (Redis) so
limits are enforced across instances.
