# Railway: one-time setup for this service

Do this **once** for the service that will run the wankr backend (the one you opened in Railway).

## 1. Use repo root and this config

- **Settings** → **Source** (or **Root Directory**).
- Set **Root Directory** to **empty** or **`.`** so the service builds from the **repo root** (where `Dockerfile` and `railway.json` are). If you already deployed from the full repo with no root directory, leave it as is.
- The repo’s `railway.json` already sets:
  - **Builder:** Dockerfile  
  - **Health check path:** `/health`  
  - **Health check timeout:** 300s  

So you don’t need to set the health check in the dashboard; it comes from the config.

## 2. Generate a public URL (if needed)

- **Settings** → **Networking** → **Generate Domain**.
- Copy the URL (e.g. `https://xxx.up.railway.app`). You’ll use it in Cloudflare as the tunnel target.

## 3. Redeploy

- **Deployments** → latest deployment → **Redeploy** (or push a commit to trigger a new deploy).

After this, the service will use the Dockerfile, serve the app, and Railway will use `/health` for liveness. For **wankrbot.com**, follow [RELAUNCH.md](RELAUNCH.md) or [WANKRBOT_NEXT_STEPS.md](WANKRBOT_NEXT_STEPS.md) (Cloudflare tunnel + DNS + SSL).
