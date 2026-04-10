import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

function DriverNavBtn({ emoji, label, active, onClick }: {
  emoji: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1 px-3">
      <span className="text-xl">{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
    </button>
  )
}

export default function DriverDashboard() {
  const navigate = useNavigate()
  const { driver, roles, logout, setActiveRole } = useMobileStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')

  useEffect(() => {
    if (!driver?.id) {
      navigate('/login')
      return
    }
    fetchDashboard()
  }, [driver?.id])

  const fetchDashboard = async (retries = 3) => {
    try {
      const r = await api.get(`/api/mobile/driver/${driver!.id}/dashboard`)
      setData(r.data.data)
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchDashboard(retries - 1), 2000)
        return
      }
    } finally {
      setLoading(false)
    }
  }

  if (!driver) return null

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
        <span className="text-white text-2xl">🚗</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm">Loading driver dashboard...</span>
      </div>
    </div>
  )

  const assigned = data?.assignedHarvests || []
  const completed = data?.completedHarvests || []
  const stats = data?.stats || {}

  const handlePickup = async (harvestId: string) => {
    setActionLoading(harvestId)
    try {
      await api.patch(`/api/harvests/${harvestId}/pickup`, {})
      await fetchDashboard()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoading('')
    }
  }

  const handleDeliver = async (harvestId: string) => {
    setActionLoading(harvestId)
    try {
      await api.patch(`/api/harvests/${harvestId}/deliver`, {})
      await fetchDashboard()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoading('')
    }
  }

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered_to_sacco: 'bg-orange-100 text-orange-700',
    graded: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 px-5 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full transform translate-x-10 -translate-y-10" />

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center">
              <span className="text-blue-700 text-sm font-black">IG</span>
            </div>
            <div>
              <p className="text-blue-200 text-xs">🚗 Driver Dashboard</p>
              <h1 className="text-white text-xl font-black">
                {driver?.fullName?.split(' ')[0]}
              </h1>
              <p className="text-blue-200 text-xs">{driver?.vehicleReg}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/driver/profile')}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-lg">👤</span>
            </button>
            <button onClick={() => { logout(); navigate('/login') }}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-lg">🚪</span>
            </button>
          </div>
        </div>

        {/* Switch to Farmer */}
        {roles.includes('farmer') && (
          <button onClick={() => { setActiveRole('farmer'); navigate('/farmer') }}
            className="bg-green-500 bg-opacity-80 text-white text-xs px-3 py-1.5 rounded-full font-bold mb-4">
            🌿 Switch to Farmer View
          </button>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{stats.pending || 0}</p>
            <p className="text-blue-200 text-xs mt-1">Pending</p>
          </div>
          <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{stats.pickedUp || 0}</p>
            <p className="text-blue-200 text-xs mt-1">In Transit</p>
          </div>
          <div className="bg-white bg-opacity-15 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{stats.totalCompleted || 0}</p>
            <p className="text-blue-200 text-xs mt-1">Completed</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-4">

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('pending')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${
              activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
            📦 Assigned ({assigned.length})
          </button>
          <button onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${
              activeTab === 'completed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}>
            ✅ Done ({completed.length})
          </button>
        </div>

        {/* ASSIGNED TAB */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            {assigned.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">✅</p>
                <p className="font-bold text-gray-900">No pending pickups!</p>
                <p className="text-gray-500 text-sm mt-1">You're all caught up 🎉</p>
              </div>
            ) : (
              assigned.map((h: any) => (
                <div key={h.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="bg-blue-50 px-5 py-3 flex items-center justify-between border-b border-blue-100">
                    <span className="font-black text-blue-700">{h.harvestNumber}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[h.status] || 'bg-gray-100 text-gray-600'}`}>
                      {h.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-700 font-bold">
                          {h.member?.fullName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{h.member?.fullName}</p>
                        <p className="text-gray-500 text-xs">{h.member?.village}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span>📞</span>
                        <a href={`tel:${h.member?.phoneNumber}`} className="text-blue-600 font-medium">
                          {h.member?.phoneNumber}
                        </a>
                      </div>
                      {h.farmLocation && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>📍</span>
                          <span className="text-gray-700">{h.farmLocation}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span>📅</span>
                        <span className="text-gray-700">
                          {new Date(h.harvestDate).toLocaleDateString('en-KE', {
                            weekday: 'long', day: 'numeric', month: 'long'
                          })}
                        </span>
                      </div>
                      {h.estimatedWeightKg && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>⚖️</span>
                          <span className="text-gray-700">Est. {h.estimatedWeightKg} kg</span>
                        </div>
                      )}
                      {h.notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <span>📝</span>
                          <span className="text-gray-600 text-xs">{h.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {h.status === 'confirmed' && (
                        <button onClick={() => handlePickup(h.id)}
                          disabled={actionLoading === h.id}
                          className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                          {actionLoading === h.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : '✅'} Mark Picked Up
                        </button>
                      )}
                      {h.status === 'picked_up' && (
                        <button onClick={() => handleDeliver(h.id)}
                          disabled={actionLoading === h.id}
                          className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                          {actionLoading === h.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : '🏭'} Mark Delivered
                        </button>
                      )}
                      <a href={`https://wa.me/254${h.member?.phoneNumber?.slice(-9)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="bg-green-500 text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-1">
                        💬 Chat
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COMPLETED TAB */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            {completed.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-bold text-gray-900">No completed pickups yet</p>
              </div>
            ) : (
              completed.map((h: any) => (
                <div key={h.id}
                  className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between border border-gray-100">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{h.harvestNumber}</p>
                    <p className="text-gray-500 text-xs">{h.member?.fullName}</p>
                    <p className="text-gray-400 text-xs">
                      {new Date(h.harvestDate).toLocaleDateString('en-KE')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[h.status] || 'bg-gray-100 text-gray-600'}`}>
                    {h.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex justify-around">
          <DriverNavBtn emoji="📦" label="Assigned" active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} />
          <DriverNavBtn emoji="✅" label="Completed" active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} />
          <DriverNavBtn emoji="👤" label="Profile" active={false} onClick={() => navigate('/driver/profile')} />
        </div>
      </div>
    </div>
  )
}