import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './ErrorBoundary'
import { clearAllWankrCache } from './components/LoginScreen/loginScreenConfig'
import { setRuntimeApiKey } from './utils/api'
import './index.css'
import App from './App.jsx'

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
  } catch (_) {}

  const rootEl = document.getElementById('root')
  if (!rootEl) {
    document.body.innerHTML = '<div style="padding:24px;color:#ff5555;font-family:monospace">#root not found. Check index.html.</div>'
  } else {
    createRoot(rootEl).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    )
  }
}

init()
