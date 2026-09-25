import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const API_URL = import.meta.env.VITE_API_URL || 'https://igembe-backend.onrender.com'

async function wakeUpBackend() {
  try {
    await fetch(`${API_URL}/health`)
  } catch {}
}

wakeUpBackend()
setInterval(wakeUpBackend, 4 * 60 * 1000)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// After a new deploy, a tab that was already open may ask for page files that
// no longer exist ("Failed to fetch dynamically imported module"). Reload
// once to pick up the new version instead of showing a blank screen.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  try {
    const last = Number(sessionStorage.getItem('igembe-chunk-reload') || 0)
    if (Date.now() - last < 10000) return   // already reloaded just now — don't loop
    sessionStorage.setItem('igembe-chunk-reload', String(Date.now()))
  } catch { /* storage unavailable — reload anyway */ }
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)