# Cloudflare setup for wankrbot.com

**For the full dashboard (Node backend + React): use [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md).** Tunnel + backend is the correct production path. Workers are static-only and require the domain and Worker in the same account.

The rest of this file is for **generic** Cloudflare domain/DNS/SSL (e.g. if you use Workers for something else, or need DNS/SSL reference).

---

## (Deprecated) Workers path

- A **Worker** `wankr` exists in `frontend/wrangler.toml` and can be deployed with `npm run deploy` in `frontend`. Custom domains in wrangler only work when the **domain zone and the Worker are in the same Cloudflare account**. For the Wankr dashboard, use **Tunnel + backend** instead; see [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md).

---

## 1. Zone (wankrbot.com) in Cloudflare

- **Add site:** [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a site** → `wankrbot.com`.
- Use the **same Cloudflare account** you use for Workers (where `wankr` is).
- At your **registrar**, set the domain’s nameservers to the two Cloudflare nameservers shown.
- Wait until the zone shows **Active**.

---

## 2. DNS (no conflict with the Worker)

- In the **wankrbot.com** zone: **DNS** → **Records**.
- For **Custom Domains** on a Worker, Cloudflare adds the right records when you deploy; you usually don’t add A/CNAME for the website by hand.
- **Remove or change** any record that would take traffic away from the Worker:
  - **A** or **AAAA** for `@` or `www` pointing to an old server IP.
  - **CNAME** for `@` or `www` pointing to something other than the Worker.
- Leave (or add) any **MX**, **TXT**, etc. you need for email or verification; they don’t conflict with the Worker.

---

## 3. Worker and custom domains

- **Workers & Pages** → select **wankr**.
- **Settings** (or **Triggers**) → **Domains and routes** / **Custom domains**.
- Confirm **wankrbot.com** and **www.wankrbot.com** are listed.  
  If not, from the repo run:
  ```bash
  cd frontend && npm run deploy
  ```

---

## 4. SSL/TLS (optional)

- In the **wankrbot.com** zone: **SSL/TLS**.
- **Full** or **Full (strict)** is fine; for Workers custom domains, Cloudflare issues the cert.
- Turn **Always Use HTTPS** on if you want HTTP → HTTPS redirects.

---

## 5. Verify

- Open **https://wankrbot.com** and **https://www.wankrbot.com** (incognito is best).
- If the page is blank, check the browser **Console** and **Network** tab for errors.
- Ensure the frontend is built with your backend URL when you need API:
  ```powershell
  cd frontend
  $env:VITE_API_BASE="https://YOUR-BACKEND-URL"
  npm run deploy
  ```

---

## Quick checklist

| Step | Where | Action |
|------|--------|--------|
| Zone | Cloudflare → Add site | Add wankrbot.com, set nameservers at registrar. |
| DNS | Zone → DNS | No A/CNAME for @ or www that override the Worker. |
| Worker | Workers & Pages → wankr | Custom domains: wankrbot.com, www.wankrbot.com. |
| SSL | Zone → SSL/TLS | Full or Full (strict); Always Use HTTPS if desired. |
| Deploy | Repo | `cd frontend && npm run deploy` when you change app or env. |

After this, Cloudflare is set up so wankrbot.com serves the same app as your local 5173 setup (with backend via `VITE_API_BASE` in production).

---

## Troubleshooting: wankrbot.com shows nothing

**1. Same Cloudflare account**

Custom domains only work when the **domain zone** (wankrbot.com) and the **Worker** (wankr) are in the **same** Cloudflare account.

- **Workers & Pages** → you should see the **wankr** worker.
- **Websites** (or **Overview**) → you should see **wankrbot.com**.
- If wankrbot.com was added under a different account or team, add it in the same account where you see the wankr worker, or move the Worker to the account that owns wankrbot.com.

**2. DNS taking traffic away from the Worker**

- In the **wankrbot.com** zone go to **DNS** → **Records**.
- For **@** (apex) and **www**: delete any **A**, **AAAA**, or **CNAME** that point to an IP or hostname that is *not* the Worker (e.g. old hosting, parking page).  
  With Custom Domains, Cloudflare should create the correct records when the Worker is deployed; extra A/CNAME records can send traffic elsewhere and the page will be blank or show the wrong site.

**3. What does the browser actually get?**

- Open **https://wankrbot.com** → press **F12** → **Network** tab → refresh.
- Click the first request (the document, usually `wankrbot.com` or `/`).
  - **Status 200** and type **document** → HTML is loading; check **Console** for JavaScript errors (e.g. failed to load `/assets/...` or CORS).
  - **Status 404** or **5xx** → request isn’t reaching the Worker or the Worker isn’t serving the asset; confirm same account and DNS (steps 1–2).
  - **No request / “blocked”** → DNS or SSL issue; confirm the zone is active and nameservers are Cloudflare’s.

**4. Test the Worker URL**

- Open **https://wankr.scarab-protocol.workers.dev** (or the URL shown after `wrangler deploy`).
- If that URL shows the app but wankrbot.com does not, the problem is domain/zone/DNS (steps 1–2), not the Worker code.

**5. Blank page but HTML loads**

- If you see “Wankr needs JavaScript” (noscript), HTML is loading but the app script failed. Open **F12 → Network**, refresh, and check the **document** and the **JS** request (e.g. `/assets/index-xxxxx.js`). If the JS is **404**, do a fresh deploy so the Worker has the latest `index.html` and JS bundle: `cd frontend && npm run deploy`.
- Hard-refresh (Ctrl+Shift+R or Cmd+Shift+R) or try incognito to avoid cached old HTML that points to an old (missing) JS file.
