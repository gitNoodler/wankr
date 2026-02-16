# wankrbot.com: Cloudflare Tunnel + full-stack backend (no Workers)

The dashboard is **not** a static site. It needs the real Node backend (Infisical, xAI key, `/api` routes, training, Grok). This is the correct way to put it online.

**Why not Workers:** Workers only serve static files. No backend, no secrets, no real Grok. Custom domains on Workers also require the domain and the Worker to be in the **same** Cloudflare account; if wankrbot.com is in your personal account and the Worker was in another (e.g. scarab-protocol), the domain would show nothing.

**Correct setup:** One server runs the full app (Node backend serves both API and the built React frontend). Cloudflare Tunnel (from the account that **owns wankrbot.com**) exposes that server at https://wankrbot.com. No account mismatch, no static-only dead end.

---

## 1. Run the backend on a host

**Option A — VPS (Hetzner CX22, Contabo, etc., ~$3–5/mo)**

```bash
# On the VPS
git clone https://github.com/yourusername/wankr.git
cd wankr
cd wankr-backend
npm install
# Add .env with XAI_API_KEY or Infisical machine identity (INFISICAL_CLIENT_ID, INFISICAL_CLIENT_SECRET, INFISICAL_PROJECT_ID)
# Build frontend so the backend can serve it (from repo root)
cd ../frontend && npm install && npm run build && cd ../wankr-backend
# Run (Infisical for prod secrets)
infisical run --env=prod -- node server.js
# Or plain: node server.js
```

**Option B — Railway**

- Connect the repo, set root to `wankr-backend` (or deploy the whole repo and set start command).
- Add env: `XAI_API_KEY` or Infisical vars. Railway runs the backend; you’ll put the Tunnel on your machine pointing at Railway’s URL, or run the tunnel from a small always-on node (see step 2).

For **Tunnel to a VPS**: run the backend and tunnel on the same machine (both on the VPS). For **Tunnel to Railway**: you can run `cloudflared` from your own machine or a tiny VM and point the tunnel at the Railway URL (e.g. `https://your-app.up.railway.app`) as the service.

---

## 2. Cloudflare Tunnel (account that owns wankrbot.com)

1. In the **Cloudflare dashboard** for the account that **owns wankrbot.com**: **Zero Trust** → **Networks** → **Tunnels** → **Create a tunnel** → **Cloudflared**.
2. Name it (e.g. `wankr`), then create. Copy the **install and run** command, e.g.:
   ```bash
   cloudflared tunnel run --token <token>
   ```
3. **Where to run it:**
   - **VPS:** SSH into the VPS, install cloudflared, paste and run the token command. Add the public hostname (step 4) so the tunnel sends wankrbot.com traffic to `http://127.0.0.1:5000`.
   - **Railway backend:** Run cloudflared somewhere that can reach the backend (e.g. your PC or a small VM). For the public hostname, set **Service** to your Railway URL, e.g. `https://your-app.up.railway.app` (or `http://...` if you use HTTP and Railway allows it).
4. In the tunnel config, **Public Hostname**:
   - **Subdomain:** (blank for apex) or `www` for www.
   - **Domain:** `wankrbot.com`
   - **Service type:** HTTP
   - **URL:** `127.0.0.1:5000` (VPS) or your Railway URL (if tunnel runs elsewhere).

Add two hostnames if you want both apex and www: one with subdomain blank (wankrbot.com), one with subdomain `www` (www.wankrbot.com).

---

## 3. DNS (wankrbot.com zone)

- In **DNS** for **wankrbot.com**, remove any **A** or **CNAME** for `@` or `www` that point to an old host or Worker. The Tunnel will create the right records when you add the public hostname (or Cloudflare will show CNAME targets for the tunnel). Don’t leave conflicting records.

---

## 4. Build frontend (same origin as backend)

The backend serves the built frontend from `frontend/dist`. When users hit https://wankrbot.com, they get the backend; the backend serves the SPA and `/api` from the same origin, so the app can use relative URLs (no `VITE_API_BASE` needed).

From your **local** machine (or CI):

```powershell
cd C:\Users\legro\Documents\GitHub\wankr\frontend
# Same origin: backend serves the app at wankrbot.com, so API is wankrbot.com/api
# Leave VITE_API_BASE unset, or set for consistency:
# $env:VITE_API_BASE="https://wankrbot.com"
npm run build
```

Then **upload** `frontend/dist` to the server that runs the backend (e.g. rsync to VPS, or trigger a redeploy on Railway that includes the new build). If you build on the VPS, run the build there and restart the Node process so it serves the new files.

**No `wrangler deploy`.** We are not using Workers for this.

---

## 5. Verify

- Open **https://wankrbot.com** (and https://www.wankrbot.com if configured). You should see the same dashboard as localhost:5173: green Online light, real Grok replies (backend with Infisical + xAI), training mode, etc.
- Hard refresh (Ctrl+Shift+R) if you had a cached blank page.

---

## Quick checklist

| Step | What |
|------|------|
| 1 | Backend running on VPS or Railway (Infisical + xAI, `node server.js`), with `frontend/dist` present (build frontend first). |
| 2 | Cloudflare Tunnel created in the **same account as wankrbot.com**; tunnel run (on VPS or elsewhere); public hostname wankrbot.com → http://127.0.0.1:5000 or Railway URL. |
| 3 | DNS: no conflicting A/CNAME for @ or www. |
| 4 | Frontend built; dist on the backend host; no Workers deploy. |
| 5 | Visit https://wankrbot.com and confirm full dashboard. |

Once the tunnel is running, you can paste the `cloudflared tunnel run` output and get the exact Zero Trust hostname config if needed.

---

## Run the tunnel (same machine as the backend)

1. **Install cloudflared** (if not already):
   - Windows: `winget install Cloudflare.cloudflared` or download from [Install cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/).
   - Ensure `cloudflared` is on your PATH (or use the full path to the exe).

2. **Get your token:** In Zero Trust → Networks → Tunnels → click your tunnel. Copy the **Run** command, e.g. `cloudflared tunnel run --token eyJ...`.

3. **Run the tunnel** (on the machine where the Node backend runs, e.g. where you run `node server.js` or wankr):
   - **Option A:** Set the token and use the repo script:
     ```bat
     set CLOUDFLARE_TUNNEL_TOKEN=eyJ...paste_your_token...
     run_tunnel.bat
     ```
   - **Option B:** Paste the full `cloudflared tunnel run --token ...` command in a new terminal and run it.

4. Leave that window open. When you see "Registered tunnel connection", wankrbot.com traffic is going to your backend. Restart the backend if needed, then test https://wankrbot.com.

---

## Troubleshooting

### `POST https://wankrbot.com/api/chat/... 405 (Method Not Allowed)` — Fix in ~60 seconds

**Cause:** The POST never reaches your Node backend. A **Cloudflare Worker** (e.g. the `wankr` Worker from an earlier deploy) is attached to wankrbot.com and serving the static frontend; it only speaks GET, so it returns 405 for POST. The real backend (Infisical + xAI) is bypassed.

**Do this exactly:**

1. **Cloudflare account that owns wankrbot.com** → **Workers & Pages** → open the **wankr** Worker (or whichever is on the domain).

2. **Remove the custom domain**
   - **Settings** → **Domains & routes** (or **Triggers** → **Custom Domains**).
   - Find **wankrbot.com** and **www.wankrbot.com**.
   - Three dots → **Remove** / **Delete** → confirm.  
   This detaches the Worker from the domain.

3. **Set up the Tunnel (correct way)**
   - **Zero Trust** → **Networks** → **Tunnels**.
   - No tunnel yet? Create one (e.g. name `wankr-tunnel`), copy `cloudflared tunnel run --token YOUR_TOKEN`.
   - Run that command on the machine running your Node backend (VPS, Railway host, or local PC for testing).
   - Tunnel config → **Public Hostname** → Add:
     - **Subdomain:** (blank for apex)
     - **Domain:** `wankrbot.com`
     - **Service:** **HTTP** → `localhost:5000` or `127.0.0.1:5000`
   - Add a second hostname with subdomain `www` if you want www.
   - Save.

4. **Clean DNS**
   - **wankrbot.com** zone → **DNS** → **Records**.
   - Delete any **A**, **AAAA**, or **CNAME** for `@` or `www` that point to a Worker or old IP. The Tunnel will create the correct CNAME when the hostname is added.

5. **Restart the backend once** (so it’s running with Infisical and the xAI key loaded).

6. **Test**
   - Hard refresh https://wankrbot.com (Ctrl+Shift+R).
   - Trigger the action that was 405ing (training sync, send message). Check backend logs; the request should hit Node. 405 should be gone.

If the domain shows nothing after removing the Worker, the Tunnel isn’t running or the hostname wasn’t added — check Tunnel status and hostnames in Zero Trust.

---

### 405 — short version

- **Cause:** Something in front (Worker or static host) is answering for wankrbot.com and only allows GET.
- **Fix:** Remove Worker from the domain (Steps 2–4 above), use Tunnel + backend only, clean DNS, hard refresh.
