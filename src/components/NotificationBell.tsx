import { useState, useRef } from 'react'
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
// The panel is a bottom sheet, not a dropdown — a plain absolutely-positioned
// dropdown with a "click outside to close" handler was closing unreliably on
// touch devices (any tap or scroll gesture registering as "outside" would
// dismiss it before the farmer could read or scroll). This only closes via
// the explicit X button or a swipe-down gesture.
export default function NotificationBell({ onViewHarvest }: { onViewHarvest?: () => void }) {
  const t = useT()
  const { notifications, markAllNotificationsRead } = useMobileStore()
  const [open, setOpen] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef(0)
  const dragging = useRef(false)

  const unread = notifications.filter(n => !n.read).length

  const handleClose = () => { setOpen(false); setDragY(0) }

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    dragging.current = true
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta > 0) setDragY(delta)
  }
  const handleTouchEnd = () => {
    dragging.current = false
    if (dragY > 80) handleClose()
    else setDragY(0)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
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
        <>
          {/* Dark overlay — deliberately has no onClick handler so tapping
              outside never closes the panel; only X / swipe-down do. */}
          <div className="fixed inset-0 bg-black/50 z-[9998]" />

          <div
            className="fixed bottom-0 left-0 right-0 z-[9999] bg-white rounded-t-3xl shadow-2xl flex flex-col"
            style={{
              height: '70vh',
              transform: `translateY(${dragY}px)`,
              transition: dragging.current ? 'none' : 'transform 200ms ease-out'
            }}
          >
            <div
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="pt-2.5 pb-1 flex justify-center flex-shrink-0 cursor-grab"
            >
              <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <p className="font-black text-gray-900">{t('common.notifications')}</p>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button onClick={markAllNotificationsRead} className="text-xs text-green-600 font-bold">
                    {t('common.markAllRead')}
                  </button>
                )}
                <button onClick={handleClose}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-black text-sm">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-4xl mb-2">🔔</p>
                  <p className="text-gray-400 text-sm">{t('common.noNotifications')}</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3.5 border-b border-gray-50 flex gap-3 ${n.read ? '' : 'bg-blue-50/60'}`}>
                    <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-gray-900">{n.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-gray-400">{timeAgo(n.createdAt, t('common.justNow'))}</p>
                        {n.harvestId && onViewHarvest && (
                          <button
                            onClick={() => { handleClose(); onViewHarvest() }}
                            className="text-xs text-green-600 font-bold"
                          >
                            {t('common.viewHarvest')} →
                          </button>
                        )}
                      </div>
                    </div>
                    {!n.read && <span className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
