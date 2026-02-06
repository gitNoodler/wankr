# Wankr API (Node.js)

Full backend for Wankr: chat, training, backup/restore. Replaces the old Flask app.

## Setup

1. Copy `.env.example` from project root to `.env`.
2. Set `XAI_API_KEY` directly, or use Infisical Machine Identity (`INFISICAL_CLIENT_ID`, `INFISICAL_CLIENT_SECRET`, `INFISICAL_PROJECT_ID`). In Infisical, create a secret named `XAI_API_KEY` or `grokWankr` in Development.

## Run

```bash
npm install
npm start
```

Runs on port 5000. The frontend (Vite dev server) proxies `/api` and `/static` to this backend.
