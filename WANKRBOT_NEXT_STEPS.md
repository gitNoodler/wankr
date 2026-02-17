# Next steps to get wankrbot.com online

Use this after **Railway is running** (e.g. brave-sparkle). Order matters.

---

## 1. Railway serves the full app (backend + frontend)

- The **Dockerfile** (multi-stage) builds the frontend, then runs the backend serving `frontend/dist` at `/`.
- In Railway: set the service **root directory** to the **repo root** and use the **Dockerfile**. Redeploy.
- **Health check:** In Railway → service → **Settings** → **Health check**, set path to **`/health`** (backend returns 200 OK). Helps avoid "crashed" status from liveness failures.
- Your app URL: **`https://brave-sparkle-production.up.railway.app`** (or your Railway URL).

---

## 2. Cloudflare: no Worker on wankrbot.com

- In the Cloudflare account that **owns wankrbot.com**: **Workers & Pages** → each Worker → **Settings** → **Domains & routes**.
- **Remove** wankrbot.com and www.wankrbot.com from any Worker. (Otherwise you get 405 on `/api`.)

---

## 3. Cloudflare Tunnel: point wankrbot.com at Railway

- Same account → **Zero Trust** → **Networks** → **Tunnels**.
- Create a tunnel (e.g. **Cloudflared**, name `wankr`) or open the existing one.
- **Public Hostname** → **Add**:
  - **Subdomain:** *(leave blank for apex)*
  - **Domain:** `wankrbot.com`
  - **Service type:** **HTTP**
  - **URL:** your Railway app URL, e.g. `https://brave-sparkle-production.up.railway.app`
- Save. Optionally add **www** (Subdomain `www`, same URL).
- Copy the tunnel **Run** command and take the value after `--token` (starts with `eyJ...`). **Do not commit this token** (see step 4).

---

## 4. Tunnel token (secure — never commit)

- **Option A — Run tunnel on your PC (dev / temporary):** Put `CLOUDFLARE_TUNNEL_TOKEN=eyJ...` in **repo root `.env`** only. `.env` is in `.gitignore`; never commit or push it. If it was ever committed, rotate the token in Cloudflare and use the new value.
- **Option B — Run tunnel 24/7 on Railway (recommended for production):** Add a **second Railway service** that runs only cloudflared. Use Railway’s **Variables** for that service: add `CLOUDFLARE_TUNNEL_TOKEN` (paste the token). No `.env` in the repo. Build/start: use a Dockerfile or Nixpacks that installs `cloudflared` and runs `cloudflared tunnel run --token $CLOUDFLARE_TUNNEL_TOKEN`. This keeps the tunnel up when your PC is off. See [docs/DEPLOYMENT_REVIEW.md](docs/DEPLOYMENT_REVIEW.md) for a snippet.

---

## 5. Run the tunnel

- **If using your PC:** In repo root run **`run_tunnel.bat`** (or `cloudflared tunnel run --token YOUR_TOKEN`). Leave it running. When you see **“Registered tunnel connection”**, wankrbot.com traffic goes to Railway.
- **If using Railway:** Deploy the tunnel service (step 4B). Once it’s running, no local script needed.

---

## 6. DNS and SSL

- **DNS:** **wankrbot.com** → **DNS**. Remove any old **A** / **CNAME** for `@` or `www` that point to an old host or Worker. The tunnel creates the right CNAMEs when you add the hostname.
- **SSL:** **SSL/TLS** → **Overview:** **Full** or **Full (strict)**. If you see certificate errors at first, try **Flexible** temporarily, then switch back to **Full** once the origin is correct. **Edge Certificates:** **Always Use HTTPS** → **On**.

---

## 7. Verify

- Open **https://wankrbot.com** (hard refresh: Ctrl+Shift+R).
- Check **https://your-railway-url.up.railway.app/health** returns `ok`.
- You should see the Wankr dashboard; try login and chat. No 405 on `/api`.

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Railway: repo root + Dockerfile; redeploy; set health check path `/health`. |
| 2 | Remove wankrbot.com from Workers & Pages. |
| 3 | Tunnel → Public Hostname: wankrbot.com → HTTP → Railway URL. Copy token. |
| 4 | Set token in Railway Variables (tunnel service) or in local `.env` only (never commit). |
| 5 | Run tunnel (PC with `run_tunnel.bat` or Railway tunnel service). |
| 6 | DNS clean; SSL Full + Always HTTPS. |
| 7 | Visit https://wankrbot.com and test; confirm `/health` returns 200. |

More detail: [GET_WANKRBOT_ONLINE.md](GET_WANKRBOT_ONLINE.md), [docs/CLOUDFLARE_CONFIG_CHECKLIST.md](docs/CLOUDFLARE_CONFIG_CHECKLIST.md), [docs/DEPLOYMENT_REVIEW.md](docs/DEPLOYMENT_REVIEW.md).
