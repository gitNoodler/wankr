# Relaunch wankrbot.com — Cloudflare + local or Railway

Use this to bring **https://wankrbot.com** back online.

- **Backend on Railway?** → **One checklist:** **[SETUP_WANKRBOT_ONLINE.md](SETUP_WANKRBOT_ONLINE.md)**. Or one-time: [RAILWAY_ONE_TIME.md](RAILWAY_ONE_TIME.md) then [WANKRBOT_NEXT_STEPS.md](WANKRBOT_NEXT_STEPS.md).
- **Backend local (e.g. `wankr.bat`)?** → Follow **Part 1** (Cloudflare) then **Part 2** (local) below.

---

## Part 1: Cloudflare dashboard (account that owns wankrbot.com)

### 1.1 Workers & Pages — keep domain off Workers

If any Worker is attached to wankrbot.com, the site will return **405** on `/api` and the real backend never gets traffic.

1. **Workers & Pages** → open the **wankr** Worker (or any Worker).
2. **Settings** → **Domains & routes** (or **Triggers** → **Custom Domains**).
3. If **wankrbot.com** or **www.wankrbot.com** is listed → **Remove** / **Delete** for each. Confirm.
4. Repeat for any other Worker that might be on wankrbot.com.

### 1.2 Zero Trust — Tunnel and public hostname

1. **Zero Trust** → **Networks** → **Tunnels**.
2. **Create a tunnel** (or open your existing one) → **Cloudflared**. Name e.g. `wankr`.
3. Copy the **Run** command; save the token (the part after `--token`) into your `.env` as:
   ```env
   CLOUDFLARE_TUNNEL_TOKEN=eyJ...
   ```
4. In the same tunnel → **Public Hostname** → **Add a public hostname**:
   - **Subdomain:** blank (apex)
   - **Domain:** `wankrbot.com`
   - **Service type:** HTTP
   - **URL:** `http://127.0.0.1:5000` (local) or **your Railway backend URL** (e.g. `https://wankr-road-production.up.railway.app`) if the backend is on Railway.
5. **Save**. Optionally add **www**: Subdomain `www`, Domain `wankrbot.com`, same HTTP URL, Save.

### 1.3 DNS (wankrbot.com zone)

1. **Websites** → **wankrbot.com** → **DNS** → **Records**.
2. **Remove** any **A** or **CNAME** for `@` or `www` that point to an old host or Worker (not the tunnel).
3. The tunnel should have created CNAME(s), e.g. `@` → `<tunnel-id>.cfargotunnel.com` (Proxied). If not, add the CNAME the tunnel page shows.

### 1.4 SSL/TLS (wankrbot.com)

1. **wankrbot.com** → **SSL/TLS**.
2. **Overview:** **Full** or **Full (strict)**.
3. **Edge Certificates:** **Always Use HTTPS** → **On**.

---

## Part 2: Local — build, backend, tunnel

### 2.1 Build frontend

From repo root:

```bash
npm run build
```

This writes `frontend/dist`. The backend serves this at `/`.

### 2.2 Start the backend

From repo root:

```bash
wankr.bat
```

(Or your usual backend start.) The backend must serve `frontend/dist` and listen on the port the tunnel uses (e.g. **5000**). Same machine as the tunnel should run the backend so the tunnel URL `http://127.0.0.1:5000` works.

### 2.3 Start the Cloudflare Tunnel

From repo root:

```bash
run_tunnel.bat
```

- Requires **CLOUDFLARE_TUNNEL_TOKEN** in `.env` (from step 1.2).
- Leave this window open. Wait until you see **"Registered tunnel connection"** — then wankrbot.com traffic is routed to your backend.

### 2.4 Verify

1. Open **https://wankrbot.com** (and https://www.wankrbot.com if you added www). Hard refresh (Ctrl+Shift+R).
2. You should see the dashboard (green Online, Grok, etc.). Send a message; no 405 on `/api`.

---

## Quick reference

| Where | What to set |
|-------|-------------|
| Workers & Pages | Remove wankrbot.com (and www) from any Worker’s custom domains. |
| Zero Trust → Tunnels | Public Hostname: `wankrbot.com` (and optionally `www`) → HTTP → `http://127.0.0.1:5000` (local) or `https://wankr-road-production.up.railway.app` (Railway). |
| wankrbot.com → DNS | No A/CNAME for @ or www to old host or Worker; tunnel CNAMEs only. |
| wankrbot.com → SSL/TLS | Full or Full (strict); Always Use HTTPS On. |
| Local | Build → Backend → Tunnel → open https://wankrbot.com |
| Railway | [WANKRBOT_NEXT_STEPS.md](WANKRBOT_NEXT_STEPS.md) → backend (Dockerfile, `/health`) + optional [tunnel/](tunnel/README.md) service + Cloudflare hostname → Railway URL. |

---

## Troubleshooting: "Invalid tunnel secret"

If `run_tunnel.bat` logs **"Unauthorized: Invalid tunnel secret"**, the token in `.env` is no longer valid (rotated, wrong tunnel, or from "Install connector" only). Get a **new Run token**:

1. **Zero Trust** → **Networks** → **Tunnels** → open your tunnel (e.g. `wankr`).
2. Open the **Run** tab (not "Install connector").
3. Copy the token from the command shown: `cloudflared tunnel run --token eyJ...` → everything after `--token `.
4. In the repo, edit **`.env`**: set `CLOUDFLARE_TUNNEL_TOKEN=` to that token only (no quotes, no spaces or newlines). Save.
5. Run **`run_tunnel.bat`** again.

If the **Run** tab has no command or token, create a new connector: **Install connector** → pick **Run** (or copy the run command if shown). Use that new token in `.env`. You can remove old connectors from the tunnel’s Connectors list if needed.

---

**Railway (backend + optional 24/7 tunnel):** [WANKRBOT_NEXT_STEPS.md](WANKRBOT_NEXT_STEPS.md) · **Tunnel on Railway:** [tunnel/README.md](tunnel/README.md)  
**First-time setup** (domain, nameservers, tunnel from scratch): [GET_WANKRBOT_ONLINE.md](GET_WANKRBOT_ONLINE.md).  
**Troubleshooting** (405, 1033, cloudflared): [docs/CLOUDFLARE_TUNNEL_SETUP.md](docs/CLOUDFLARE_TUNNEL_SETUP.md) and [docs/CLOUDFLARE_CONFIG_CHECKLIST.md](docs/CLOUDFLARE_CONFIG_CHECKLIST.md).
