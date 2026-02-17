# Bring wankrbot.com back online

Minimal runbook. **Cloudflare dashboard steps:** [docs/CLOUDFLARE_CONFIG_CHECKLIST.md](docs/CLOUDFLARE_CONFIG_CHECKLIST.md). Full details: [docs/CLOUDFLARE_TUNNEL_SETUP.md](docs/CLOUDFLARE_TUNNEL_SETUP.md).

## 1. Build frontend

From repo root:

```bash
npm run build
```

This writes `frontend/dist`. The backend serves this at `/`.

## 2. Start the backend

From repo root:

```bash
wankr.bat
```

Or: `start_backend.bat` (API only) and start the frontend dev server separately. For production, the **same machine** that runs the tunnel should run the backend so the tunnel can point at `http://127.0.0.1:5000`.

Backend must serve the built app: ensure `frontend/dist` exists (step 1) and the Node process can read it.

## 3. Start the Cloudflare Tunnel

From repo root:

```bash
run_tunnel.bat
```

- Requires **CLOUDFLARE_TUNNEL_TOKEN** in `.env` (from Cloudflare Zero Trust → Networks → Tunnels → your tunnel → copy the value after `--token` in the Run command).
- Leave this window open. When you see "Registered tunnel connection", wankrbot.com traffic is routed to your backend.

## 4. Check DNS (if the site doesn’t load)

- In the **Cloudflare account that owns wankrbot.com**: **DNS** for **wankrbot.com**.
- Remove any **A** or **CNAME** for `@` or `www` that point to an old host or Worker. The tunnel creates the right records when you add the public hostname in Zero Trust.
- **Workers & Pages**: ensure no Worker is attached to **wankrbot.com** (otherwise you get 405 on `/api` and no real backend). See [docs/CLOUDFLARE_TUNNEL_SETUP.md](docs/CLOUDFLARE_TUNNEL_SETUP.md) “POST … 405” section.

## 5. Verify

Open **https://wankrbot.com**. You should see the dashboard (green Online, Grok, etc.). Hard refresh (Ctrl+Shift+R) if the page was cached.

---

**Quick order:** Build → Backend → Tunnel → open https://wankrbot.com
