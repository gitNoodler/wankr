## Wankr Dev Commands

All commands assume repo root: `C:\Users\legro\Documents\GitHub\wankr`. Use this single location only; do not rely on a synced copy elsewhere (it can get out of sync).

### Quick start (recommended)
- `wankr.bat`  
  Kills ports 5000/5173, starts Node API (Infisical) + Vite UI. Both run minimized.

### Manual start (two terminals)
- Backend (Node API):
```
cd wankr-backend
npm install
npm start
```

- Frontend (React + Vite):
```
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173` (UI)  
API: `http://127.0.0.1:5000`

### Production build (served by Node)
```
cd frontend
npm install
npm run build
cd ../wankr-backend
npm start
```

Open: `http://127.0.0.1:5000`

### Infisical setup (secrets)
One-time init:
```
infisical_init.bat
```

Run backend with Infisical:
```
run_with_infisical.bat
```

### Other helper scripts
- `start_backend.bat` — starts the Node API only (with Infisical).
- `run_dev.bat` — wrapper that calls `wankr.bat`.
- `start_wankr.bat` — wrapper that calls `wankr.bat`.

### Frontend utilities
```
cd frontend
npm run lint
npm run preview
```

### Python CLI roast bot
```
python wankr_bot.py
```

With Infisical secrets injected:
```
infisical run --env=dev -- python wankr_bot.py
```

### Training mode (locked)
Set in `.env` (repo root):
```
WANKR_TRAINING_KEY=your-secret-key-here
```

Chat commands:
- `/wankr n da clankr` → enable training mode
- `/gangstr is uh prankstr` → disable training mode

### Testing (run after changing launchers or startup)
1. Start servers: `wankr.bat`
2. Run: `test.bat`  
   - Checks API (http://127.0.0.1:5000/api/health) and UI (http://localhost:5173).  
   - Prints OK/FAIL for each.
