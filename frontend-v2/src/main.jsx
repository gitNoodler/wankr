import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './ErrorBoundary'
import { setRuntimeApiKey } from './utils/api'
import './index.css'
import App from './App.jsx'

/** Remove all wankr-related keys from localStorage and sessionStorage. */
function clearAllWankrCache() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wankr_')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
  try {
    const keys = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith('wankr_')) keys.push(k);
    }
    keys.forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}

if (import.meta.env.DEV) {
  window.clearAllWankrCache = clearAllWankrCache
}

async function init() {
  try {
    const r = await fetch('/api/config')
    if (r.ok) {
      const data = await r.json()
      if (data?.apiKey) setRuntimeApiKey(data.apiKey)
    }
  } catch { /* config endpoint unavailable */ }

  const rootEl = document.getElementById('root')
  if (!rootEl) {
    document.body.innerHTML = '<div style="padding:24px;color:#ff5555;font-family:monospace">#root not found. Check index.html.</div>'
  } else {
    createRoot(rootEl).render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
    )
  }
}

init()
