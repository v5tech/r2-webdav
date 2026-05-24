# Development

This guide is for contributors who want to run R2 WebDAV locally and modify
the source. End users deploying via Cloudflare Pages should read the
[README](../README.md) instead.

## Prerequisites

- **Node.js 20+** (`node --version`)
- **npm** (bundled with Node.js)
- A Cloudflare account with R2 enabled (only required for full-stack local
  development; UI-only changes do not need this)

## Setup

```bash
git clone https://github.com/v5tech/r2-webdav.git
cd r2-webdav
npm install
```

## Verification commands

Run these before opening a PR:

```bash
npm test            # vitest run (unit tests)
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build       # vite build (verify production build succeeds)
```

---

## Workflow A — UI development (recommended for most changes)

Start the Vite dev server:

```bash
npm run dev
```

Open http://localhost:5173. Vite serves the **frontend only** — server-side
code under `functions/` is NOT executed in this mode, so API calls like
`/api/login` will return 404.

**Use this workflow when changing:**

- React components / Tailwind styles / shadcn/ui usage
- `src/locales/*.json` (i18n)
- React Router routes / page layouts

---

## Workflow B — Modifying server-side code (`functions/`)

When you need to change `functions/api/*` or `functions/webdav/*` (auth,
WebDAV verbs, trash, etc.), **prefer the preview-branch workflow** over
local `wrangler pages dev`. It is simpler and matches production exactly:

```bash
git checkout -b feat/your-change
# ...edit functions/...
git add functions/...
git commit -m "feat: ..."
git push -u origin feat/your-change
```

Cloudflare Pages will automatically deploy your branch to
`<branch>.<project>.pages.dev`. Test your changes on that preview URL
(login / WebDAV / preview) before opening a PR to `main`.

---

## Workflow C — Local full-stack (advanced, optional)

Only needed when iterating rapidly on `functions/` without waiting for
Cloudflare Pages preview deployments. Setup is heavier and the R2 bucket
is mocked locally (data is NOT shared with production).

```bash
# One-time setup
cp .dev.vars.example .dev.vars         # edit and set a local test password
cp wrangler.toml.example wrangler.toml # edit name + bucket_name

# Each time
npm run build
npx wrangler pages dev dist --r2 BUCKET
# → http://localhost:8788
```

Notes:

- `.dev.vars` is gitignored. It supplies `env.WEBDAV_USERNAME`,
  `env.WEBDAV_PASSWORD`, and `env.WEBDAV_PUBLIC_READ` to local
  `wrangler pages dev` only — never to production.
- `--r2 BUCKET` tells wrangler to mock the `BUCKET` binding with a local
  miniflare-backed R2 namespace. Files uploaded locally are stored under
  `.wrangler/` and do not touch your production R2 bucket.
- `wrangler.toml` is gitignored because it contains your unique project /
  bucket names. Use `wrangler.toml.example` as the template.

---

## Changing the WebDAV password

**Production:**

1. Cloudflare Dashboard → your Pages project → Settings → Variables and
   Secrets
2. Edit `WEBDAV_PASSWORD` (encrypted)
3. Redeploy (the new value takes effect on the next deployment)

**Local (Workflow C only):**

1. Edit `.dev.vars`, change `WEBDAV_PASSWORD=...`
2. Restart `wrangler pages dev`

---

## Deployment

See the [README's Deploy section](../README.md#deploy) for the two
production deployment paths (Cloudflare Pages UI integration vs.
`wrangler pages deploy` CLI).
