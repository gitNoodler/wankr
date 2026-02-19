---
name: setup-cloudflare-domain
description: Guides correct setup of a domain on Cloudflare: adding the site, DNS records, SSL/TLS, proxy settings, and verification. Use when the user wants to set up a Cloudflare domain, point a domain to a host, configure DNS for Cloudflare, or fix Cloudflare domain/SSL/DNS issues.
---

# Set Up Cloudflare Domain Correctly

Use this skill when helping add a domain to Cloudflare or fix domain/DNS/SSL configuration. Work through the phases in order; skip phases that are already done.

## Task Progress Checklist

```
- [ ] Phase 1: Add domain to Cloudflare (or add site)
- [ ] Phase 2: Configure DNS records
- [ ] Phase 3: Set SSL/TLS mode
- [ ] Phase 4: Set proxy (orange/grey cloud) and verify
- [ ] Phase 5: Optional redirects and hardening
```

---

## Phase 1: Add Domain to Cloudflare

1. **New domain (registrar elsewhere)**
   - In Cloudflare Dashboard: Add site → enter the root domain (e.g. `example.com`), not a subdomain.
   - Choose a plan (Free is fine for most).
   - Cloudflare will scan existing DNS records; review and fix any that are wrong or missing.

2. **Nameservers**
   - Cloudflare will show two (or more) nameservers (e.g. `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`).
   - At the **domain registrar** (where the domain was bought), replace the current nameservers with Cloudflare’s. Save and wait for propagation (minutes to 48 hours).
   - Domain is “active” on Cloudflare only after the registrar points to Cloudflare’s nameservers.

3. **Subdomain only (domain already on Cloudflare)**
   - No “add site” needed. Go to DNS for the zone and add the records in Phase 2.

---

## Phase 2: Configure DNS Records

1. **Identify target**
   - Know the **destination** of the domain: IP(s) for A/AAAA, or hostname for CNAME.
   - For a single server: A (IPv4) and optionally AAAA (IPv6).
   - For a hostname (e.g. Vercel, Netlify, Load Balancer): CNAME.

2. **Add records in Cloudflare DNS**
   - **A**: Type A, name `@` (apex) or subdomain (e.g. `www`, `api`), IPv4 address, Proxy status (see Phase 4).
   - **AAAA**: Same as A for IPv6 if the origin has IPv6.
   - **CNAME**: Name = subdomain (e.g. `www` → `example.com` or `cname.vercel-dns.com`). Do **not** use CNAME at apex on Cloudflare unless using CNAME flattening (see below).
   - **Apex (root)**: Use A/AAAA at `@`, or enable **CNAME flattening** (Dashboard → DNS → enable “Flatten CNAME at root”) if you must point apex to a hostname.

3. **CAA (optional but recommended)**
   - Add CAA records to restrict which CAs can issue certs (e.g. only Let’s Encrypt and Cloudflare). Reduces risk of mis-issuance.

4. **Common mistakes**
   - Wrong name: `@` = apex, `www` = www subdomain; no trailing dot in the name.
   - CNAME at apex without CNAME flattening → use A/AAAA or enable flattening.
   - Typos in target hostname or IP; double-check.

---

## Phase 3: Set SSL/TLS Mode

1. **SSL/TLS** (Dashboard → SSL/TLS)
   - **Full** or **Full (strict)** when the origin server has a valid TLS certificate (recommended: Full (strict)).
   - **Flexible** only if the origin has no HTTPS (not recommended long-term; traffic to origin is unencrypted).
   - For most setups with an HTTPS-capable origin: use **Full (strict)**.

2. **Origin certificate (optional)**
   - If origin only accepts Cloudflare’s cert: SSL/TLS → Origin Server → Create Certificate; install that cert on the origin and use Full (strict).

---

## Phase 4: Proxy Status and Verification

1. **Proxy (orange cloud) vs DNS only (grey cloud)**
   - **Proxied (orange)**: Traffic goes through Cloudflare (DDoS, caching, WAF, SSL). Use for web endpoints you want to protect and accelerate.
   - **DNS only (grey)**: Only DNS resolution; traffic goes directly to the target. Use for non-HTTP targets (e.g. mail, SSH, game servers) or when you must expose the origin IP.

2. **Verify**
   - After nameserver propagation: open the domain in a browser; check that the expected site loads.
   - Check SSL: HTTPS works and no certificate warnings.
   - From Dashboard: SSL/TLS → Edge Certificates: confirm certificate is active and no errors.

3. **If the site doesn’t load**
   - Confirm nameservers at registrar point to Cloudflare.
   - Confirm A/AAAA or CNAME point to the correct target.
   - If proxied: confirm origin is reachable on 443 (for Full/Full strict) and that firewall allows Cloudflare IPs if restricted.
   - Use “Dig” or “DNS lookup” tools to confirm DNS resolves to expected values.

---

## Phase 5: Optional Redirects and Hardening

1. **Redirect apex to www (or vice versa)**
   - Use **Rules** → **Redirect Rules** (or Page Rules on older plans): e.g. redirect `example.com/*` to `https://www.example.com/$1` (301), or the opposite, so one canonical host is used.

2. **Force HTTPS**
   - SSL/TLS → Edge Certificates: turn **Always Use HTTPS** on so HTTP requests are redirected to HTTPS.

3. **Security / performance**
   - Consider **Minimum TLS Version** (e.g. 1.2 or higher).
   - Adjust **Caching** and **Firewall** rules as needed for the project.

---

## Quick Reference

| Goal                    | Action |
|-------------------------|--------|
| Point domain to server  | A (and AAAA) to server IP(s); proxy on if you want Cloudflare in front. |
| Point subdomain to app  | CNAME to app’s hostname (e.g. Vercel/Netlify); proxy on for HTTPS/cache. |
| Apex to hostname        | A/AAAA at `@` or CNAME flattening + CNAME at `@`. |
| No HTTPS on origin      | Use Flexible only temporarily; add TLS on origin and switch to Full (strict). |
| Mail on same domain     | Add MX (and optionally SPF/DKIM/DMARC); keep mail subdomain DNS-only if mail doesn’t go through Cloudflare. |

---

## Additional Resources

- For Cloudflare’s own docs on adding a site and DNS, refer to [Cloudflare Docs](https://developers.cloudflare.com/) when the user needs deeper detail or API usage.
