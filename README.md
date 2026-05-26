# R2 WebDAV

A modern Cloudflare R2 storage manager with WebDAV support, file preview,
authentication, dark mode, and i18n.

> Forked from [FlareDrive](https://github.com/longern/FlareDrive) by
> [@longern](https://github.com/longern). Rewritten in Phase 0-3 to Vite 8 +
> React 19 + Tailwind v4 + shadcn/ui (Radix), with added JWT authentication,
> file preview, TextPad, i18n (zh-CN / en), dark mode, and CSP hardening.
> See [Acknowledgments](#acknowledgments).

## Features

- **Modern UI** — React 19 + Vite 8 + Tailwind v4 + shadcn/ui (Radix), responsive
  across 375 / 768 / 1280 viewports
- **Authentication** — `/login` page with JWT session cookie (HMAC-SHA256
  derived from `WEBDAV_PASSWORD`); session revocation on password change
- **File operations** — Browse / create folder / upload / rename / delete /
  copy / move / multi-select, with breadcrumb navigation and client-side search
- **Multi-type preview** — Image (`<img>`), video / audio (native controls),
  PDF (pdfjs-dist with paginator), code (Shiki with on-demand language
  registration), plain text (1 MB cap)
- **TextPad** — Quick `.txt` / `.md` upload drawer for note-taking directly
  into the current directory
- **i18n** — Zh-CN / English with auto language detection (browser language +
  user override persisted to localStorage)
- **Dark mode** — Light / dark / follow-system, persisted to localStorage
- **Settings page** — `/settings` for theme + language toggle
- **Thumbnails** — Auto-generated for image / video / PDF
- **Large file upload** — Chunked multipart upload (≥ 100 MB supported via
  the web UI; standard WebDAV clients are limited to 100 MB by Cloudflare
  Workers)
- **WebDAV endpoint** — Compatible with rclone, [Cx File Explorer](https://play.google.com/store/apps/details?id=com.cxinventor.file.explorer),
  [BD File Manager](https://play.google.com/store/apps/details?id=com.liuzho.file.explorer),
  and any standards-compliant WebDAV client
- **Security** — Content Security Policy (enforce mode), nosniff,
  Referrer-Policy, Permissions-Policy

## Deploy

### Prerequisites

- A [Cloudflare](https://dash.cloudflare.com/) account
- R2 enabled with at least one bucket created
- (Optional) A custom domain

### Option A — Cloudflare Pages UI integration (recommended)

1. Fork this repository and connect your fork to Cloudflare Pages
   - Framework preset: **None** (uses Vite directly)
   - Build command: `npm run build`
   - Build output directory: `dist`
2. After the initial build, go to your Pages project → **Settings**:
   - **Bindings** → Add **R2 bucket binding** with **Variable name** = `BUCKET`,
     pointing to your R2 bucket
   - **Variables and Secrets** → Add:
     - `WEBDAV_USERNAME` (encrypted)
     - `WEBDAV_PASSWORD` (encrypted)
     - `WEBDAV_PUBLIC_READ` = `0` or `1` (plain text; optional, defaults to `0`)
3. Trigger a redeploy from the **Deployments** tab so the bindings take effect
4. (Optional) Add a custom domain in **Custom domains**

### Option B — Wrangler CLI

For automated or scripted deployments:

```bash
cp wrangler.toml.example wrangler.toml
# Edit wrangler.toml: change `name` and `bucket_name` to your unique values
npm run build
npx wrangler pages deploy dist
```

Secrets (`WEBDAV_USERNAME`, `WEBDAV_PASSWORD`) must be set once via the
Cloudflare Dashboard or `wrangler pages secret put`:

```bash
npx wrangler pages secret put WEBDAV_USERNAME --project-name=<your-project>
npx wrangler pages secret put WEBDAV_PASSWORD --project-name=<your-project>
```

## Authentication

R2 WebDAV uses a modern `/login` page (HTML form) rather than HTTP Basic Auth.
On successful login the server sets a JWT cookie (`fd_session`) signed with
HMAC-SHA256, derived from `WEBDAV_PASSWORD`. Changing `WEBDAV_PASSWORD` and
redeploying invalidates all existing sessions.

For WebDAV clients (rclone, BD/Cx File Manager) that do not support the login
page, the WebDAV endpoint accepts HTTP Basic Auth headers directly.

## WebDAV endpoint

Configure your WebDAV client with:

- **URL:** `https://<your-domain>/webdav`
- **Username:** `WEBDAV_USERNAME`
- **Password:** `WEBDAV_PASSWORD`

**Large file limitation:** Cloudflare Workers caps request bodies at 100 MB.
Files larger than that must be uploaded via the web UI, which uses chunked
multipart upload.

**COPY / MOVE limitation:** The R2 Workers binding has no server-side copy.
COPY/MOVE streams every byte through the Worker and is bounded by the
Workers wall-time budget. For multi-GB single files or directories with
thousands of children, prefer doing the copy with rclone configured against
the R2 S3 endpoint directly (bypassing this WebDAV server) — rclone retries
client-side and scales independent of Worker limits.

## Rate limiting (recommended)

To protect `/api/login` from brute-force attempts, add a Cloudflare
**Rate Limiting Rule** via the dashboard:

1. Cloudflare Dashboard → your zone → **Security** → **WAF** → **Rate limiting rules**
2. Create a rule:
   - **If:** `(http.request.uri.path eq "/api/login" and http.request.method eq "POST")`
   - **Then:** Block, with a threshold of e.g. 5 requests per 1 minute per IP

This is optional but strongly recommended for production deployments.

## R2 lifecycle: abort incomplete multipart uploads (recommended)

Large file uploads use S3-style multipart. If a client aborts mid-upload
(crash, network drop), the already-uploaded parts stay in the bucket and
are billed as storage. R2's bucket lifecycle can clean them up automatically.

Configure the rule once via `wrangler`:

```bash
npx wrangler r2 bucket lifecycle add <your-bucket> \
  --name "abort-incomplete-mpu" \
  --abort-multipart-days 7
```

Or in the Cloudflare Dashboard → R2 → your bucket → **Settings** → **Object lifecycle rules** → add a rule with **Abort incomplete multipart uploads after** = `7 days`.

R2 then aborts any multipart upload not completed within the window. No
application code or cron job needed.

## Customization

- **Theme** — Settings page → toggle Light / Dark / System
- **Language** — Settings page → toggle 中文 / English

Preferences are stored in `localStorage` (`fd_theme`, `i18nextLng`).

## Development

See [docs/development.md](./docs/development.md) for the contributor guide,
including UI development workflow, server-side preview-branch workflow,
optional local full-stack setup (`wrangler pages dev`), and how to change
the WebDAV password.

For Chinese documentation, see [README.zh.md](./README.zh.md).

## Acknowledgments

This project would not exist without the original work of the FlareDrive
community.

### Original FlareDrive

R2 WebDAV is a fork of [FlareDrive](https://github.com/longern/FlareDrive) by
[Siyu Long](https://github.com/longern) ([@longern](https://github.com/longern)),
with additional contributions from
[@SujalPatel-2020](https://github.com/SujalPatel-2020) and other
[contributors](https://github.com/longern/FlareDrive/graphs/contributors).

The R2 WebDAV fork (2026-) was rewritten across Phase 0-3:

- **Phase 0** — Build chain modernization (CRA → Vite 8, Material-UI →
  Tailwind v4 + shadcn/ui)
- **Phase 1** — Authentication overhaul (JWT cookie + session secret
  derivation + revocation hooks)
- **Phase 2** — Full UI rebuild (file CRUD, preview dialog, TextPad drawer,
  i18n, dark mode, settings page)
- **Phase 3** — Hardening (Content Security Policy enforce, Lighthouse,
  documentation)

### Upstream WebDAV

The WebDAV protocol implementation is based on
[r2-webdav](https://github.com/abersheeran/r2-webdav) by
[abersheeran](https://github.com/abersheeran), preserved from the original
FlareDrive project.

### License

R2 WebDAV is distributed under the [MIT License](./LICENSE), inheriting
the license of the original FlareDrive project. See `LICENSE` for full
copyright attribution.
