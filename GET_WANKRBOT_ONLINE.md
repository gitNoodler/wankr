# Get wankrbot.com online

One runbook: **first-time setup** and **every time** you bring the site up.

---

## First-time setup (do once)

### 1. Domain on Cloudflare

- **Add site:** Cloudflare Dashboard → **Add site** → enter `wankrbot.com` (root domain).
- **Nameservers:** At your **registrar** (where you bought the domain), set the nameservers to the two Cloudflare gives you (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`). Wait for propagation (minutes to 48h).
- **DNS:** In Cloudflare, **DNS** for wankrbot.com — remove any old **A** / **CNAME** for `@` or `www` that point to an old host or Worker. The tunnel will add the right records later.

### 2. No Worker on the domain

- **Workers & Pages** → open any Worker that might use wankrbot.com → **Settings** → **Domains & routes**.
- **Remove** wankrbot.com and www.wankrbot.com from custom domains. (Otherwise you get 405 on `/api`.)

### 3. Create the Cloudflare Tunnel

- **Zero Trust** (same account that owns wankrbot.com) → **Networks** → **Tunnels** → **Create a tunnel** → **Cloudflared**.
- Name it (e.g. `wankr`), create. Copy the **Run** command and take **only the part after `--token`** (long string starting with `eyJ...`).
- In the tunnel → **Public Hostname** → **Add**:
  - **Subdomain:** *(blank for apex)*  
  - **Domain:** `wankrbot.com`  
  - **Service type:** **HTTP**  
  - **URL:** `http://127.0.0.1:5000` (same machine as backend) or your backend URL if the tunnel runs elsewhere.
- Save. Optionally add a second hostname: Subdomain `www`, Domain `wankrbot.com`, same HTTP URL.

### 4. Put the token in `.env`

In the repo root, create or edit `.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=eyJ...paste_the_token_here...
```

(Get it from Zero Trust → Tunnels → your tunnel → Run command → after `--token`.)

### 5. Install cloudflared (if not already)

- **Windows:** [Install cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) (e.g. via winget or the MSI). `run_tunnel.bat` looks for it in `C:\Program Files\cloudflared\` or `C:\Program Files (x86)\cloudflared\`, or in PATH.
- **Mac/Linux:** Install from Cloudflare’s package repo or download the binary.

### 6. SSL (recommended)

- In Cloudflare: **wankrbot.com** → **SSL/TLS** → **Overview:** **Full** or **Full (strict)**.
- **Edge Certificates:** **Always Use HTTPS** → **On**.

**Full checklist:** [docs/CLOUDFLARE_CONFIG_CHECKLIST.md](docs/CLOUDFLARE_CONFIG_CHECKLIST.md).  
**Detailed Tunnel + backend options:** [docs/CLOUDFLARE_TUNNEL_SETUP.md](docs/CLOUDFLARE_TUNNEL_SETUP.md).

---

## Every time you bring the site up

Run these from the **repo root** (same machine that will run the tunnel).

| Step | Command / action |
|------|-------------------|
| 1. Build frontend | `npm run build` (writes `frontend/dist`) |
| 2. Start backend | `wankr.bat` (serves API + built app on port 5000) |
| 3. Start tunnel | `run_tunnel.bat` (leave window open until you see “Registered tunnel connection”) |
| 4. Verify | Open **https://wankrbot.com** (hard refresh: Ctrl+Shift+R) |

**Shortcut:** Run `bring_online.bat` to build; it will remind you to start `wankr.bat` and `run_tunnel.bat`.

---

## If the site doesn’t load

- **405 on `/api`:** A Worker is still on the domain → remove it from **Workers & Pages** (see “No Worker on the domain” above).
- **Error 1033 / blank:** Tunnel not connected or wrong hostname → check **Zero Trust → Tunnels** → Public Hostname (wankrbot.com → HTTP → `http://127.0.0.1:5000`); ensure `run_tunnel.bat` is running and backend is up.
- **DNS / SSL:** Follow [docs/CLOUDFLARE_CONFIG_CHECKLIST.md](docs/CLOUDFLARE_CONFIG_CHECKLIST.md).

---

## Deploying backend elsewhere (VPS, Railway, etc.)

- Run the **Node backend** on the host (it must serve `frontend/dist` at `/` and API at `/api`).
- Run **cloudflared** on a machine that can reach that backend (same host or another). Use the tunnel’s Public Hostname URL = your backend (e.g. `http://127.0.0.1:5000` on the VPS, or `https://your-app.up.railway.app` if the tunnel runs elsewhere).
- Build: from repo root `npm run build`; upload `frontend/dist` to the backend host (or build on the host). See [DEPLOY.md](DEPLOY.md) and [docs/CLOUDFLARE_TUNNEL_SETUP.md](docs/CLOUDFLARE_TUNNEL_SETUP.md).

**Production (Railway):** For 24/7 tunnel, run cloudflared as a [separate Railway service](tunnel/README.md) with `CLOUDFLARE_TUNNEL_TOKEN` in Variables. Set the backend service health check path to **`/health`**. See [docs/DEPLOYMENT_REVIEW.md](docs/DEPLOYMENT_REVIEW.md).
