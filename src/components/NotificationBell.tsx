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

interface AnnouncementItem {
  id: string
  title: string
  message: string
  createdAt: string
  isRead: boolean
}

// Bell icon styled to match the existing white/15 icon buttons in the
// dashboard headers (farmer: green gradient, agent: blue gradient).
// The panel is a bottom sheet, not a dropdown — a plain absolutely-positioned
// dropdown with a "click outside to close" handler was closing unreliably on
// touch devices (any tap or scroll gesture registering as "outside" would
// dismiss it before the farmer could read or scroll). This only closes via
// the explicit X button or a swipe-down gesture.
//
// Announcements are a separate data source from `notifications` (the SSE-fed
// activity feed in the store) — they live on whichever dashboard fetched
// them, so they're passed in as props rather than pulled from the store.
// AgentDashboard doesn't pass any, so that usage is unaffected.
export default function NotificationBell({
  onViewHarvest,
  announcements = [],
  onAnnouncementRead,
  onMarkAllAnnouncementsRead,
}: {
  onViewHarvest?: () => void
  announcements?: AnnouncementItem[]
  onAnnouncementRead?: (id: string) => void
  onMarkAllAnnouncementsRead?: () => void
}) {
  const t = useT()
  const { notifications, markAllNotificationsRead } = useMobileStore()
  const [open, setOpen] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStartY = useRef(0)
  const dragging = useRef(false)
  // Optimistic read state — the parent only re-fetches announcements on its
  // own schedule, so without this a tapped announcement would keep showing
  // as unread until the next reload completes.
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set())

  const isAnnRead = (a: AnnouncementItem) => a.isRead || locallyRead.has(a.id)
  const unreadAnnouncements = announcements.filter(a => !isAnnRead(a))
  const readAnnouncements = announcements.filter(isAnnRead)
  const unreadNotifs = notifications.filter(n => !n.read).length
  const totalUnread = unreadAnnouncements.length + unreadNotifs

  const handleClose = () => { setOpen(false); setDragY(0) }

  const handleReadAnnouncement = (a: AnnouncementItem) => {
    if (isAnnRead(a)) return
    setLocallyRead(prev => new Set(prev).add(a.id))
    onAnnouncementRead?.(a.id)
  }

  const handleMarkAllRead = () => {
    markAllNotificationsRead()
    if (unreadAnnouncements.length) {
      setLocallyRead(prev => { const next = new Set(prev); unreadAnnouncements.forEach(a => next.add(a.id)); return next })
      onMarkAllAnnouncementsRead?.()
    }
  }

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

  // No outside-tap-to-close: the sheet stays open until the X button or a
  // swipe-down. Touch/click events are also stopped at the sheet and overlay
  // so they can't bubble (React events bubble through the component tree even
  // for position:fixed elements) into the host page's handlers — e.g. the
  // farmer home tab's pull-to-refresh, whose re-renders used to dismiss it.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        className="relative w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center"
      >
        <span className="text-white">🔔</span>
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Dark overlay — touch-action:none stops the background page from
              scrolling underneath while the sheet is open. Tapping it does
              nothing; only the X button or a swipe-down closes the sheet. */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998]"
            style={{ touchAction: 'none' }}
            onClick={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}
          />

          <div
            onClick={stop} onTouchStart={stop} onTouchMove={stop} onTouchEnd={stop}
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
                {totalUnread > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-green-600 font-bold">
                    {t('common.markAllRead')}
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleClose() }}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-black text-sm">
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {announcements.length > 0 && (
                <div>
                  <p className="px-4 pt-3 pb-1 text-xs font-black text-gray-400 uppercase tracking-wide">
                    📢 {t('common.announcements')}
                  </p>
                  {unreadAnnouncements.map(a => (
                    <button key={a.id} onClick={() => handleReadAnnouncement(a)}
                      className="w-full text-left px-4 py-3.5 border-b border-gray-50 flex gap-3 bg-blue-50/60">
                      <span className="text-xl flex-shrink-0 mt-0.5">📢</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-gray-900">{a.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{a.message}</p>
                        <p className="text-xs text-gray-400 mt-1.5">{timeAgo(a.createdAt, t('common.justNow'))}</p>
                      </div>
                      <span className="w-2.5 h-2.5 bg-blue-600 rounded-full flex-shrink-0 mt-1.5" />
                    </button>
                  ))}
                  {readAnnouncements.length > 0 && (
                    <details className="group">
                      <summary className="px-4 py-2 text-xs font-bold text-gray-400 cursor-pointer select-none">
                        {t('common.readAnnouncements')} ({readAnnouncements.length})
                      </summary>
                      {readAnnouncements.map(a => (
                        <div key={a.id} className="px-4 py-3 border-b border-gray-50 flex gap-3 opacity-50">
                          <span className="text-xl flex-shrink-0 mt-0.5">📢</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-gray-900">{a.title}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{a.message}</p>
                            <p className="text-xs text-gray-400 mt-1.5">{timeAgo(a.createdAt, t('common.justNow'))}</p>
                          </div>
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              )}

              {notifications.length > 0 && (
                <p className="px-4 pt-3 pb-1 text-xs font-black text-gray-400 uppercase tracking-wide">
                  🔔 {t('common.activity')}
                </p>
              )}
              {announcements.length === 0 && notifications.length === 0 ? (
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
