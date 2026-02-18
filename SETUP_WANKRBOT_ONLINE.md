# Set up wankrbot.com (Railway + Cloudflare Tunnel)

One checklist to get **https://wankrbot.com** online. Backend runs on **Railway** (`wankr-road-production`); Cloudflare Tunnel routes the domain to it.

---

## Order of operations

| # | Where | What to do |
|---|--------|------------|
| 1 | Railway | Confirm app is deployed and healthy; copy URL `https://wankr-road-production.up.railway.app`. |
| 2 | Cloudflare | Remove wankrbot.com from any Worker (Workers & Pages → each Worker → Domains → remove wankrbot.com, www). |
| 3 | Cloudflare | Tunnel: Public Hostname wankrbot.com (and optionally www) → HTTP → **that Railway URL**. Copy **Run** token. |
| 4 | Local | Put token in repo `.env`: `CLOUDFLARE_TUNNEL_TOKEN=eyJ...` (from Run tab, not Install connector). |
| 5 | Local | Run `run_tunnel.bat` (or `setup.bat`). Leave it open until you see tunnel registered. |
| 6 | Cloudflare | DNS: only tunnel CNAMEs for @ and www; remove old A/CNAME to Workers or other hosts. SSL: Full, Always HTTPS On. |
| 7 | Browser | Open https://wankrbot.com and test (hard refresh). |

---

## 1. Railway

- **Dashboard** → your service (wankr-road-production).
- **Settings** → **Root Directory**: repo root (or empty). **Networking** → **Generate Domain** if needed.
- **Deployments** → latest → **Redeploy** if you changed anything. Wait for **Success**.
- **URL:** `https://wankr-road-production.up.railway.app` — open `/health` in browser; should return `ok`.

---

## 2. Cloudflare — Workers off wankrbot.com

- **Workers & Pages** → open the **wankr** Worker (and any other that might use the domain).
- **Settings** → **Domains & routes** (or **Triggers** → **Custom Domains**).
- **Remove** **wankrbot.com** and **www.wankrbot.com** if listed. Confirm.

---

## 3. Cloudflare — Tunnel and Public Hostname

- **Zero Trust** → **Networks** → **Tunnels**.
- **Create a tunnel** (or open existing) → **Cloudflared**, name e.g. `wankr`.
- **Public Hostname** → **Add a public hostname**:
  - **Subdomain:** *(blank for apex)*  
  - **Domain:** `wankrbot.com`  
  - **Service type:** **HTTP**  
  - **URL:** `https://wankr-road-production.up.railway.app`
- **Save.** Optionally add **www**: Subdomain `www`, Domain `wankrbot.com`, same URL, Save.
- Open the **Run** tab. Copy the **Run** command and take **only the token** (the part after `--token `, starts with `eyJ...`). Do **not** use the "Install connector" token.

---

## 4. Local — tunnel token in .env

- In the repo root, edit **`.env`**.
- Add or set one line (no quotes, no spaces around `=`):
  ```env
  CLOUDFLARE_TUNNEL_TOKEN=eyJ...
  ```
- Paste the token you copied from the tunnel **Run** tab. Save. **Do not commit .env** (it’s in `.gitignore`).

---

## 5. Local — run the tunnel

- From repo root run:
  ```bat
  run_tunnel.bat
  ```
  Or run **`setup.bat`** (same thing + reminder of Cloudflare steps).
- Leave the window open. Wait until log shows **"Registered tunnel connection"** (or similar). Then wankrbot.com traffic goes to Railway.

---

## 6. Cloudflare — DNS and SSL

- **Websites** → **wankrbot.com** → **DNS**. Remove any **A** or **CNAME** for `@` or `www` that point to an old host or Worker. Keep only the tunnel CNAMEs.
- **CNAME target for this tunnel:** `274b881f-bdbe-4cb4-baec-1c28648f6a07.cfargotunnel.com` (Proxied). Add CNAME `@` → that target; add CNAME `www` → same target.
- **SSL/TLS** → **Overview:** **Full** or **Full (strict)**. **Edge Certificates:** **Always Use HTTPS** → **On**.

---

## 7. Verify

- Open **https://wankrbot.com** (and https://www.wankrbot.com if you added www). Hard refresh (Ctrl+Shift+R).
- You should see the Wankr dashboard; try chat. No 405 on `/api`.
- Optional: check **https://wankr-road-production.up.railway.app/health** returns `ok`.

---

## If tunnel says "Invalid tunnel secret"

- In **Zero Trust** → **Networks** → **Tunnels** → your tunnel → **Run** tab, copy the token again (use the **Run** command, not Install connector).
- Update **`.env`**: `CLOUDFLARE_TUNNEL_TOKEN=` that new token. Save and run **`run_tunnel.bat`** again.

---

**More detail:** [RELAUNCH.md](RELAUNCH.md) · [WANKRBOT_NEXT_STEPS.md](WANKRBOT_NEXT_STEPS.md) · [RAILWAY_ONE_TIME.md](RAILWAY_ONE_TIME.md)
