import { useState, useEffect, useRef } from 'react'
import api from '../lib/api'

export default function ConnectionStatus() {
  const [visible, setVisible] = useState(false)
  const [restored, setRestored] = useState(false)
  const failCount = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doCheck = async () => {
    try {
      await api.get('/health', { timeout: 10000 })
      const wasOffline = failCount.current >= 3
      failCount.current = 0
      if (wasOffline) {
        setVisible(false)
        setRestored(true)
        setTimeout(() => setRestored(false), 4000)
      }
    } catch {
      failCount.current++
      if (failCount.current >= 3) {
        setVisible(true)
        setRestored(false)
      }
    }
  }

  useEffect(() => {
    // Check every 3 minutes only — not aggressively
    timerRef.current = setInterval(doCheck, 180_000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleRetry = async () => {
    try {
      await api.get('/health', { timeout: 15000 })
      failCount.current = 0
      setVisible(false)
      setRestored(true)
      setTimeout(() => setRestored(false), 3000)
    } catch {
      setVisible(true)
    }
  }

  const handleDismiss = () => {
    setVisible(false)
    failCount.current = 0
  }

  // Show brief "connected" confirmation
  if (restored) {
    return (
      <div
        style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}
        className="bg-green-600 text-white text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2"
      >
        <div className="w-2 h-2 bg-green-300 rounded-full" />
        Connected ✓
      </div>
    )
  }

  // Show offline banner
  if (!visible) return null

  return (
    <div
      style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999, maxWidth: '280px' }}
      className="bg-white border border-orange-200 rounded-2xl shadow-xl p-4"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-gray-900 text-sm">Server waking up...</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Render free tier sleeps after 15 min. Takes ~30s to wake up.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-gray-300 hover:text-gray-500 text-xl font-bold flex-shrink-0 leading-none"
        >
          ×
        </button>
      </div>
      <button
        onClick={handleRetry}
        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 rounded-xl"
      >
        Retry Now
      </button>
    </div>
  )
}