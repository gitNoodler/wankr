# Cloudflare Workers Setup (DEPRECATED)

**⚠️ This document is deprecated.** Workers are not used for wankrbot.com production deployment.

**Use instead:** [CLOUDFLARE_TUNNEL_SETUP.md](CLOUDFLARE_TUNNEL_SETUP.md) — the correct production path using Cloudflare Tunnel + Express backend.

**Why Workers don't work for Wankr:** Workers only serve static files. The Wankr dashboard requires the full Node backend (Infisical secrets, xAI API, `/api` routes, training pipeline, Grok bot). Additionally, custom domains on Workers require the domain and Worker to be in the same Cloudflare account.

This file can be safely removed from project knowledge.
