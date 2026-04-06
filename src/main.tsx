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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)