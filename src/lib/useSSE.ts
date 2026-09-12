import { useEffect, useRef } from 'react'
import { useMobileStore } from '../store/mobileStore'
import { API_URL } from './api'

// Live push notifications over the backend's SSE endpoint. Mounted once at
// the app root (see App.tsx) so the connection — and the notifications it
// feeds into the store — survive navigation between pages.
export function useSSE() {
  const { member, agent, driver, addNotification } = useMobileStore()
  const agentId = agent?.id || driver?.id
  const memberId = member?.id
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!memberId && !agentId) {
      esRef.current?.close()
      esRef.current = null
      return
    }

    const params = new URLSearchParams()
    if (memberId) params.set('memberId', memberId)
    if (agentId) params.set('agentId', agentId)

    const es = new EventSource(`${API_URL}/api/events?${params.toString()}`)
    esRef.current = es

    es.onmessage = (evt) => {
      let data: any
      try { data = JSON.parse(evt.data) } catch { return }

      // Skip the initial handshake ping — not a user-facing notification.
      if (!data?.type || data.type === 'connected') return

      addNotification({
        type: data.type,
        title: data.title || 'Notification',
        message: data.message || '',
        createdAt: data.createdAt || new Date().toISOString(),
        harvestId: data.harvestId,
        loanId: data.loanId,
      })
    }

    // EventSource reconnects automatically on error/drop — nothing to do here
    // beyond letting it retry; we just avoid crashing on a transient error.
    es.onerror = () => {}

    return () => {
      es.close()
      esRef.current = null
    }
  }, [memberId, agentId])
}
