# Deploy from local dev (5173) to wankrbot.com

Everything you build and test at **http://localhost:5173** can be deployed to **https://wankrbot.com** so production matches dev.

## One-command flow

From the **repo root**:

```bat
push-to-wankrbot.bat
```

This script:

1. Builds the frontend (`npm run sync-online` = clear cache + `npm run build`), producing the same assets that 5173 would serve.
2. Reminds you to **commit and push** so your host (e.g. Railway) redeploys.

After you push, your host rebuilds (e.g. using the root **Dockerfile**, which builds the frontend and runs the backend). The Cloudflare Tunnel then serves the new app at **wankrbot.com**.

## Manual steps (same result)

1. **Build frontend** (repo root):
   ```bat
   npm run sync-online
   ```
   Or: `cd frontend && npm run clear-cache && npm run build`

2. **Commit and push** to the branch your production host uses (e.g. `main`):
   ```bat
   git add -A
   git commit -m "Deploy: sync 5173 to wankrbot.com"
   git push
   ```

3. **Wait for deploy** (e.g. Railway build finishes). Then open **https://wankrbot.com** and hard refresh (Ctrl+Shift+R) if needed.

## How it stays in sync

| Where        | What runs |
|-------------|-----------|
| **localhost:5173** | Vite dev server; same source as `frontend/`. |
| **wankrbot.com**   | Backend serves `frontend/dist`. That `dist` is built from the same `frontend/` source when you run `sync-online` and when the Dockerfile runs `npm run build` in CI/Railway. |

So: implement and test on 5173 → run `push-to-wankrbot.bat` (or build + commit + push) → production at wankrbot.com gets the same UI and API behavior.

## If you don’t use Railway

- **VPS / own server:** After `npm run sync-online`, copy `frontend/dist` (and any backend changes) to the server and restart the Node process. See [docs/CLOUDFLARE_TUNNEL_SETUP.md](docs/CLOUDFLARE_TUNNEL_SETUP.md).
- **Other CI/CD:** Have your pipeline run `npm run sync-online` (or `cd frontend && npm run build`) from the repo root so `frontend/dist` is built before the backend image is built or files are uploaded.
