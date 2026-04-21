import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [harvestLimit, setHarvestLimit] = useState<any>(null)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [annRes, limitRes] = await Promise.allSettled([
        member?.id
          ? api.get(`/api/announcements/member/${member.id}`)
          : api.get('/api/announcements'),
        api.get('/api/harvest-limits/today')
      ])

      if (annRes.status === 'fulfilled') {
        const d = annRes.value.data
        setAnnouncements(d.data || [])
      }
      if (limitRes.status === 'fulfilled') {
        setHarvestLimit(limitRes.value.data.data?.limit || null)
      }
    } catch (err) {
      console.error('Notifications fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (announcementId: string) => {
    if (!member?.id) return
    try {
      await api.post(`/api/announcements/${announcementId}/read`, { memberId: member.id })
      setAnnouncements(prev =>
        prev.map(a => a.id === announcementId ? { ...a, isRead: true } : a)
      )
    } catch (err) { console.error('Mark as read error:', err) }
  }

  const markAllAsRead = async () => {
    if (!member?.id) return
    setMarkingAll(true)
    try {
      await api.post('/api/announcements/read-all', { memberId: member.id })
      setAnnouncements(prev => prev.map(a => ({ ...a, isRead: true })))
    } catch (err) { console.error('Mark all as read error:', err) }
    finally { setMarkingAll(false) }
  }

  const typeColors: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
    success: 'bg-green-50 border-green-200',
    urgent: 'bg-red-50 border-red-200',
  }
  const typeIcons: Record<string, string> = {
    info: 'ℹ️', warning: '⚠️', success: '✅', urgent: '🚨',
  }
  const typeTextColors: Record<string, string> = {
    info: 'text-blue-800', warning: 'text-yellow-800',
    success: 'text-green-800', urgent: 'text-red-800',
  }

  const unreadCount = announcements.filter(a => !a.isRead).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-8">
        <div className="flex items-center justify-between mb-1">
          <button onClick={() => navigate('/farmer')} className="text-green-200 text-sm">← Back</button>
          <button onClick={fetchData} className="text-green-200 text-sm">🔄 Refresh</button>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div>
            <h1 className="text-white text-2xl font-black">Notifications 🔔</h1>
            <p className="text-green-200 text-sm mt-0.5">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="bg-white bg-opacity-20 text-white text-xs px-3 py-2 rounded-xl font-bold active:bg-opacity-30"
            >
              {markingAll ? '...' : '✅ Mark All Read'}
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Today's Harvest Limit */}
        {harvestLimit && (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">⚖️</span>
              </div>
              <div>
                <p className="font-black text-orange-900">Today's Harvest Limit</p>
                <p className="text-orange-600 text-xs">
                  {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {harvestLimit.maxWeightKg && (
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Max Weight</p>
                  <p className="font-black text-orange-700 text-xl">
                    {Number(harvestLimit.maxWeightKg).toLocaleString()} kg
                  </p>
                </div>
              )}
              {harvestLimit.maxBundles && (
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Max Bundles</p>
                  <p className="font-black text-orange-700 text-xl">{harvestLimit.maxBundles}</p>
                </div>
              )}
            </div>
            {harvestLimit.notes && (
              <p className="text-xs text-orange-700 mt-3 bg-white rounded-xl p-3">
                📝 {harvestLimit.notes}
              </p>
            )}
          </div>
        )}

        {/* Announcements */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center">
            <p className="text-5xl mb-4">🔔</p>
            <p className="font-bold text-gray-700">No announcements</p>
            <p className="text-gray-400 text-sm mt-1">Check back later for SACCO updates</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann: any) => (
              <div key={ann.id}
                className={`rounded-2xl border ${typeColors[ann.type] || typeColors.info} ${ann.isRead ? 'opacity-70' : ''}`}>
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="text-xl">{typeIcons[ann.type] || 'ℹ️'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-black text-sm ${typeTextColors[ann.type] || typeTextColors.info}`}>
                          {ann.title}
                          {!ann.isRead && (
                            <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full align-middle" />
                          )}
                        </p>
                        {!ann.isRead && (
                          <button
                            onClick={() => markAsRead(ann.id)}
                            className="text-xs text-gray-500 hover:text-green-600 flex-shrink-0 font-medium underline"
                          >
                            Mark read
                          </button>
                        )}
                        {ann.isRead && (
                          <span className="text-xs text-gray-400 flex-shrink-0">✓ Read</span>
                        )}
                      </div>
                      <p className="text-gray-700 text-sm mt-1 leading-relaxed">{ann.message}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">
                          {new Date(ann.createdAt || ann.created_at).toLocaleDateString('en-KE', {
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        {ann.createdBy && (
                          <p className="text-xs text-gray-400">— {ann.createdBy}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact info */}
        <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
          <p className="text-sm text-gray-600 mb-3">Questions? Contact the SACCO office.</p>
          <div className="flex gap-3 justify-center">
            <a href="tel:+254757630995"
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold">
              📞 Call
            </a>
            <a href="https://wa.me/254757630995"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold">
              💬 WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}