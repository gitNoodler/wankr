# Update wankrbot.com after pushing to GitHub

wankrbot.com is served by **Railway** (backend + frontend in one service). Pushing to GitHub does **not** update the live site until Railway rebuilds and redeploys.

## Option A: Railway dashboard (recommended)

1. Open [Railway](https://railway.app) → your project → the **backend service** (the one that runs the Node app).
2. Go to **Deployments**.
3. Click the **⋮** (or **Redeploy**) on the **latest** deployment, or use **Deploy** from the **Source** tab to deploy the latest commit from GitHub.
4. Wait for the build to finish (Dockerfile builds frontend then backend). Status should show **Success**.
5. Hard refresh https://wankrbot.com (Ctrl+Shift+R) to avoid cached assets.

## Option B: Railway CLI

From the repo root (with Railway linked to this project):

```bash
railway up
```

(or `railway deploy` / `railway run` depending on your CLI version)

## If Railway is not connected to GitHub

- **Settings** → **Source** → connect the **GitHub repo** and set the branch (e.g. `main`).
- Enable **Deploy on push** so future pushes auto-deploy.
- Then trigger one deploy (Option A or B) so the current code goes live.

## After deploy

- Tunnel (Cloudflare or `run_tunnel.bat`) must be running and pointing at the Railway URL so wankrbot.com routes to the new deployment.
- If the tunnel runs on your PC, no change needed; if it runs as a Railway service, it already talks to the same project’s backend.
