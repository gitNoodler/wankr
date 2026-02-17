# Cloudflare Tunnel (Railway service)

Run this as a **separate Railway service** so wankrbot.com stays reachable 24/7 without running `run_tunnel.bat` on your PC.

1. In Railway, add a **new service**; set **root directory** to **`tunnel`**.
2. Add variable **`CLOUDFLARE_TUNNEL_TOKEN`** (from Zero Trust → Tunnels → your tunnel → Run command, value after `--token`).
3. Deploy. No port needed; the container runs `cloudflared tunnel run` and connects outbound to Cloudflare.

See [docs/DEPLOYMENT_REVIEW.md](../docs/DEPLOYMENT_REVIEW.md) for full steps.
