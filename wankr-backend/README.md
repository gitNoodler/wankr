# Wankr secure proxy

Loads the Grok API key from Infisical at startup and forwards `POST /v1/chat/completions` to xAI. The key never touches the browser.

## Setup

1. In Infisical: create a Machine Identity (e.g. `wankr-proxy`), Universal Auth → copy Client ID and Client Secret. Grant that identity **Read** access to secrets in **Development**.
2. In the project, create a secret named **grokWankr** in Development with your xAI API key.
3. Copy `.env.example` to `.env` and set:
   - `INFISICAL_CLIENT_ID`
   - `INFISICAL_CLIENT_SECRET`
   - `INFISICAL_PROJECT_ID` (required; use your project ID from Infisical dashboard)

## Run

```bash
node server.js
```

Then start Flask (from project root: `python app.py`) and open http://127.0.0.1:5000. Chat requests go to the proxy on port 3000; the key stays in Infisical and this process only.
