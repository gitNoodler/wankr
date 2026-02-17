# Deployment review — best practices applied

This doc captures mitigations for common Railway + Cloudflare Tunnel pitfalls (persistence, security, health checks, build optimization). Reference: community and official troubleshooting.

---

## What we’ve implemented

| Area | Risk | Mitigation in this repo |
|------|------|-------------------------|
| **Port** | Railway assigns `PORT` at runtime; hardcoded port causes crash. | Backend uses `process.env.PORT` when set; fallback range 5000–5010 only for local dev. |
| **Health check** | App deploys but Railway marks it “crashed” or tunnel reports no activity. | Backend exposes **`/health`** (200 OK). Set Railway service health check path to **`/health`**. |
| **Token security** | Tunnel token in committed `.env` leaks access. | `.env` is in `.gitignore`. Docs say: set **CLOUDFLARE_TUNNEL_TOKEN** in Railway Variables (or local `.env` only); never commit; rotate if exposed. |
| **Tunnel persistence** | Running `run_tunnel.bat` on a dev PC is not 24/7—power/restart kills the tunnel. | Docs recommend running **cloudflared as a separate Railway service** for production (see below). |
| **Build size/speed** | Single-stage Dockerfile with frontend build bloats image and build time. | **Multi-stage Dockerfile:** stage 1 builds frontend; stage 2 copies only `frontend/dist` + backend; smaller final image. |
| **SSL/DNS** | Old CNAMEs or Workers cause 405/blank; wrong SSL mode causes loops. | Checklist: remove Worker from domain; clean DNS; use Full (strict) when origin has TLS; enable Always Use HTTPS after verifying. |

---

## Run the tunnel on Railway (24/7)

For production, run **cloudflared** as a **second service** in the same Railway project so the tunnel stays up when your PC is off.

1. **New service** in the same project (e.g. “wankr-tunnel”).
2. **Variables:** Add `CLOUDFLARE_TUNNEL_TOKEN` (paste the token from Zero Trust → Tunnels → your tunnel → Run command).
3. **Build/run** — use a small Dockerfile so the token comes from Railway’s env (never baked into the image):
   ```dockerfile
   FROM cloudflare/cloudflared:latest
   ENTRYPOINT ["/bin/sh", "-c", "exec cloudflared tunnel --no-autoupdate run --token \"$CLOUDFLARE_TUNNEL_TOKEN\""]
   ```
   Put it in a subfolder (e.g. `tunnel/Dockerfile`), set the tunnel service **root directory** to `tunnel`, and add **Variable** `CLOUDFLARE_TUNNEL_TOKEN` in Railway for that service.
4. **No need to expose a port** for this service; it’s outbound-only.
5. **Public hostname** in Cloudflare must point to your **backend** URL (e.g. `https://brave-sparkle-production.up.railway.app`), not the tunnel service.

If you use a Dockerfile for the tunnel, put it in a subfolder (e.g. `tunnel/Dockerfile`) and set the tunnel service root to that folder so it doesn’t build the main app.

---

## Railway health check

- In the **backend** service: **Settings** → **Health check** (or **Deploy** config).
- **Path:** `/health`
- Backend responds with `200` and body `ok` for liveness.

---

## IPv6 / networking

Railway’s internal networking may use IPv6. If the tunnel (running on Railway) fails to reach the backend URL, try using the backend’s **public HTTPS URL** in the tunnel’s Public Hostname (e.g. `https://brave-sparkle-production.up.railway.app`). That avoids internal hostname resolution issues.

---

## References

- [WANKRBOT_NEXT_STEPS.md](../WANKRBOT_NEXT_STEPS.md) — step-by-step checklist.
- [GET_WANKRBOT_ONLINE.md](../GET_WANKRBOT_ONLINE.md) — first-time and every-time runbook.
- [CLOUDFLARE_CONFIG_CHECKLIST.md](CLOUDFLARE_CONFIG_CHECKLIST.md) — DNS, SSL, Worker removal.
