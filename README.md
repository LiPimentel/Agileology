# Agileology Wave — Website & CMS

A self-owned replacement for the Wix site at agileologywave.com: a public
website with a blog, plus a backoffice (admin panel) for managing pages,
posts, media, site settings, and visitor communications — built per the
project PRD.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS) — one app serves
  both the public site and the backoffice.
- **PostgreSQL + Prisma ORM** (driver adapter: `@prisma/adapter-pg`).
- Custom session-based auth (bcrypt + mandatory TOTP 2FA), no third-party
  auth service.
- Nodemailer over SMTP for chat/contact email delivery.
- `sharp` for image processing, `sanitize-html` for rich text sanitization.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Fill in `DATABASE_URL` (a PostgreSQL connection string), `SESSION_SECRET`
   (`openssl rand -hex 32`), and the `SMTP_*` / `ADMIN_SEED_*` values. See
   the comments in `.env.example` for what each one does.

3. **Create the database schema**

   ```bash
   npx prisma migrate dev
   ```

4. **Seed the first admin account and default content**

   ```bash
   npm run db:seed
   ```

   This creates the admin user from `ADMIN_SEED_EMAIL` /
   `ADMIN_SEED_PASSWORD`, the default site/blog/communications settings, and
   three starter pages (home, contact, privacy policy). **Change the seeded
   password after your first login.**

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Public site: http://localhost:3000 — Backoffice: http://localhost:3000/admin

## Backoffice basics

- First login walks you through **mandatory 2FA enrollment**
  (`/admin/setup-2fa`) — scan the QR code with an authenticator app
  (Google Authenticator, Authy, etc.).
- **Pages** (`/admin/pages`): create/edit/duplicate/delete pages, arrange
  content blocks (text, image, link, video), set a background image with a
  color overlay, and optionally attach a Map and/or Contact Form component
  to any page (not just `/contact`).
- Every page/post edit is saved as a **draft** first (autosaved every 30s).
  Nothing changes on the live site until you click **"Guardar y publicar"**,
  which snapshots the content so it can be rolled back later from that
  page's **Historial** (version history).
- **Blog** (`/admin/posts`): same block editor, plus excerpt, tags, a
  featured image, and scheduled publishing (set a future "Publicar el"
  date). Layout (grid vs. list) is set once for the whole blog at
  `/admin/settings/blog`.
- **Comunicaciones** (`/admin/settings/communications`): where chat
  messages and contact-form submissions get emailed.
- **Bandeja de entrada** (`/admin/inbox`): view and delete chat/contact
  submissions.
- **Auditoría** (`/admin/settings/audit`): a log of every content-changing
  backoffice action.

## Deployment notes

A few things from the PRD are infrastructure choices made at deploy time,
not application code — see `SECURITY.md` for the full list. In short:

- **Admin subdomain**: the app already supports `admin.<yourdomain>`
  (see `src/proxy.ts`) — point that DNS record at the same deployment and
  it works; `/admin` also still works directly if you don't set up the
  subdomain.
- **Uploaded media**: images are written to `public/uploads/` on local
  disk. That's fine on a traditional Node server / VPS / Docker deployment
  with a persistent volume, but **will not persist** on a stateless
  serverless platform (e.g. Vercel's default runtime). If you deploy
  there, swap `src/lib/image.ts`'s `saveUploadedImage` to write to an
  object store (S3, Cloudflare R2, Supabase Storage, etc.) instead.
- **Email**: configured for Gmail SMTP with an
  [app password](https://myaccount.google.com/apppasswords). For better
  deliverability at scale, consider a transactional provider (Resend,
  Postmark) later — only `src/lib/mailer.ts` would need to change.
- **HTTPS, backups, SPF/DKIM/DMARC, bot/CDN protection**: hosting-provider
  configuration, documented in `SECURITY.md`.

## Project structure

```
prisma/schema.prisma        Data model
prisma/seed.ts               First-run admin + default content
src/proxy.ts                 Backoffice gate + admin subdomain routing
src/lib/                     Auth, mailer, sanitization, image processing,
                              rate limiting, audit log, page/post publish logic
src/components/blocks/       Public renderer for content blocks
src/components/admin/        Block editor, media picker, background picker
src/components/public/       Nav, footer, chat widget, contact form, map embed
src/app/(public)/            Public site (home, [slug], blog, blog/[slug])
src/app/admin/               Backoffice (login, 2FA, dashboard, CRUD screens)
```
