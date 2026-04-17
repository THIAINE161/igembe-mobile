import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [harvestLimit, setHarvestLimit] = useState<any>(null)

  useEffect(() => {
    fetchData()
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [annRes, limitRes] = await Promise.allSettled([
        api.get('/api/announcements'),
        api.get('/api/harvest-limits/today')
      ])

      if (annRes.status === 'fulfilled') {
        setAnnouncements(annRes.value.data.data || [])
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

  const typeColors: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200',
    warning: 'bg-yellow-50 border-yellow-200',
    success: 'bg-green-50 border-green-200',
    urgent: 'bg-red-50 border-red-200',
  }

  const typeIcons: Record<string, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
    urgent: '🚨',
  }

  const typeTextColors: Record<string, string> = {
    info: 'text-blue-800',
    warning: 'text-yellow-800',
    success: 'text-green-800',
    urgent: 'text-red-800',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/farmer')}
            className="text-green-200 text-sm flex items-center gap-2">
            ← Back
          </button>
          <button onClick={fetchData}
            className="text-green-200 text-sm">
            🔄 Refresh
          </button>
        </div>
        <h1 className="text-white text-2xl font-black mt-4">Notifications 🔔</h1>
        <p className="text-green-200 text-sm mt-1">
          Announcements from Igembe SACCO
        </p>
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
                  {new Date().toLocaleDateString('en-KE', {
                    weekday: 'long', day: 'numeric', month: 'long'
                  })}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {harvestLimit.max_weight_kg && (
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Max Weight</p>
                  <p className="font-black text-orange-700 text-xl">
                    {Number(harvestLimit.max_weight_kg).toLocaleString()} kg
                  </p>
                </div>
              )}
              {harvestLimit.max_bundles && (
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Max Bundles</p>
                  <p className="font-black text-orange-700 text-xl">
                    {harvestLimit.max_bundles}
                  </p>
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
            <p className="text-gray-400 text-sm mt-1">
              Check back later for updates from SACCO
            </p>
          </div>
        ) : (
          announcements.map((ann: any) => (
            <div key={ann.id}
              className={`rounded-2xl p-5 border ${typeColors[ann.type] || typeColors.info}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-xl">{typeIcons[ann.type] || 'ℹ️'}</span>
                </div>
                <div className="flex-1">
                  <p className={`font-black text-sm ${typeTextColors[ann.type] || typeTextColors.info}`}>
                    {ann.title}
                  </p>
                  <p className="text-gray-700 text-sm mt-1 leading-relaxed">{ann.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-400">
                      {new Date(ann.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    {ann.created_by && (
                      <p className="text-xs text-gray-400">— {ann.created_by}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Contact info */}
        <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
          <p className="text-sm text-gray-600 mb-3">
            Questions? Contact the SACCO office directly.
          </p>
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