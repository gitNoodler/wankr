# Deploy settings for wankr

Build runs from **repo root**. Use these settings so the host finds the built files.

## Build command (all hosts)

```bash
npm run build
```

This runs `cd frontend && npm run build` and writes output to `frontend/dist`.

## Output / publish directory

- **`frontend/dist`** — when build is run from repo root (recommended).

Alternatively set **Root directory** to `frontend` and use:
- Build command: `npm run build`
- Output directory: `dist`

## By host

- **Vercel** — uses [vercel.json](vercel.json): build command, output directory, and install (root + frontend) are set.
- **Netlify** — uses [netlify.toml](netlify.toml): build command and publish directory are set.
- **Cloudflare Pages** (Git connection) — in the dashboard set:
  - Build command: `npm run build`
  - Build output directory: `frontend/dist`
  - Root directory: leave empty (or set to `frontend` and then use output `dist`).
- **Cloudflare Workers** — from repo root: `cd frontend && npm run build && npx wrangler deploy`. Or use the `frontend` folder as the project and run `npm run deploy` there (see [frontend/wrangler.toml](frontend/wrangler.toml)).
