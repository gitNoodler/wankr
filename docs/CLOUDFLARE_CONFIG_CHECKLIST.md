# Cloudflare config for wankrbot.com (Tunnel)

Do these in order in the **Cloudflare account that owns wankrbot.com**. Use this when bringing the site online or fixing 405 / blank page.

---

## 1. Remove Worker from the domain (if present)

If a Worker is on wankrbot.com, it will return 405 for `/api` and the real backend never gets traffic.

1. Go to **Workers & Pages** (left sidebar or dashboard).
2. Open the **wankr** Worker (or any Worker listed).
3. **Settings** → **Domains & routes** (or **Triggers** → **Custom Domains**).
4. If **wankrbot.com** or **www.wankrbot.com** is listed → **Remove** / **Delete** for each. Confirm.
5. Repeat for any other Worker that might be attached to wankrbot.com.

---

## 2. Tunnel: create or open

1. Go to **Zero Trust** (same account; may be under a different dashboard or team).
2. **Networks** → **Tunnels**.
3. **Create a tunnel** → **Cloudflared** (or open your existing tunnel).
4. Name (e.g. `wankr`), create. Copy the **Run** command and save the token (the part after `--token`) into your `.env` as `CLOUDFLARE_TUNNEL_TOKEN`.

---

## 3. Tunnel: Public Hostname (wankrbot.com → backend)

In the same tunnel:

1. **Public Hostname** tab (or **Configure** → **Public Hostname**).
2. **Add a public hostname** (or **Add**):
   - **Subdomain:** leave **blank** (apex) for wankrbot.com.
   - **Domain:** `wankrbot.com`.
   - **Service type:** **HTTP**.
   - **URL:** `http://127.0.0.1:5000` (backend on same machine as tunnel) or your backend URL (e.g. `https://your-app.up.railway.app` if tunnel runs elsewhere).
3. **Save**.
4. (Optional) Add a second hostname for **www**:
   - **Subdomain:** `www`
   - **Domain:** `wankrbot.com`
   - **Service type:** **HTTP**
   - **URL:** same as above.
   - **Save**.

---

## 4. DNS (wankrbot.com zone)

1. Go to **Websites** (or **Overview**) → click **wankrbot.com**.
2. **DNS** → **Records**.
3. **Remove** any of these if they point to an old host or Worker (not the tunnel):
   - **A** or **AAAA** for name `@` (apex).
   - **A**, **AAAA**, or **CNAME** for name `www`.
4. The tunnel normally creates the correct CNAME(s) when you add the public hostname. You should see something like:
   - `@` → CNAME → `<tunnel-id>.cfargotunnel.com` (Proxied).
   - `www` → same, if you added the www hostname.
5. If the tunnel did **not** create records: add **CNAME** for `@` (or use the target Cloudflare shows in the tunnel’s Public Hostname section). For apex, Cloudflare may show “CNAME flattening” or a special apex CNAME target; use that.

---

## 5. SSL/TLS (optional but recommended)

1. Still in **wankrbot.com** → **SSL/TLS**.
2. **Overview:** set to **Full** or **Full (strict)** (Flexible only if the origin has no HTTPS).
3. **Edge Certificates:** turn **Always Use HTTPS** **On** (redirect HTTP → HTTPS).

---

## 6. If you see Error 1033 ("unable to resolve")

Cloudflare has no active tunnel for wankrbot.com. Do this:

1. **New token:** Zero Trust → Tunnels → your tunnel → copy the **Run** command → use only the part after `--token` in `.env` as `CLOUDFLARE_TUNNEL_TOKEN=...`.
2. **Public hostname:** Same tunnel → **Public Hostname** → add (or fix): Subdomain blank, Domain `wankrbot.com`, Service HTTP, URL `http://127.0.0.1:5000`. Save.
3. **Run tunnel:** On your PC (where the backend runs), run `run_tunnel.bat` and leave it open until the log shows the tunnel registered (no "Invalid tunnel secret" or "Register tunnel error").
4. **Backend:** Ensure `wankr.bat` is running so port 5000 is listening.

Then try https://wankrbot.com again (hard refresh).

---

## 7. Verify

- Run the tunnel on your machine: `run_tunnel.bat` (with `CLOUDFLARE_TUNNEL_TOKEN` in `.env`). Wait until you see “Registered tunnel connection”.
- Open **https://wankrbot.com** (and https://www.wankrbot.com if you added www). Hard refresh (Ctrl+Shift+R).
- You should see the Wankr dashboard; try sending a message or training sync. No 405 on `/api`.

---

## Quick reference

| Where | What to set |
|-------|-------------|
| Workers & Pages | Remove wankrbot.com (and www) from any Worker’s custom domains. |
| Zero Trust → Tunnels | Public Hostname: `wankrbot.com` (and optionally `www`) → HTTP → `http://127.0.0.1:5000`. |
| wankrbot.com → DNS | No A/CNAME for @ or www pointing to old host or Worker; tunnel CNAMEs only. |
| wankrbot.com → SSL/TLS | Full or Full (strict); Always Use HTTPS On. |
