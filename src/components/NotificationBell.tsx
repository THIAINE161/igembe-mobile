import { useState, useRef, useEffect } from 'react'
import { useMobileStore } from '../store/mobileStore'
import { useT } from '../lib/useT'

const TYPE_ICON: Record<string, string> = {
  harvest_agent_assigned: '🧑‍🌾',
  harvest_assigned: '🌿',
  harvest_status_changed: '🌿',
  loan_status_changed: '💰',
  announcement: '📢',
  mpesa_payment_confirmed: '📱',
}

function timeAgo(iso: string, justNowLabel: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return justNowLabel
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

// Bell icon styled to match the existing white/15 icon buttons in the
// dashboard headers (farmer: green gradient, agent: blue gradient).
export default function NotificationBell() {
  const t = useT()
  const { notifications, markAllNotificationsRead } = useMobileStore()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => {
    if (!open) return
    // "Mark them as read when viewed" — viewing means opening the dropdown.
    const timer = setTimeout(() => markAllNotificationsRead(), 600)
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', onClickOutside) }
  }, [open, markAllNotificationsRead])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center"
      >
        <span className="text-white">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[85vw] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="font-black text-gray-900 text-sm">{t('common.notifications')}</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-gray-400 text-sm">{t('common.noNotifications')}</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`px-4 py-3 border-b border-gray-50 last:border-0 flex gap-2.5 ${n.read ? '' : 'bg-blue-50/60'}`}>
                  <span className="text-lg flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-gray-900 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt, t('common.justNow'))}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
