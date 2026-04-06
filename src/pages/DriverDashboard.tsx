import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function DriverDashboard() {
  const navigate = useNavigate()
  const { driver, roles, logout, setActiveRole } = useMobileStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending')

  const fetchDashboard = useCallback(async (retries = 3) => {
    if (!driver?.id) { navigate('/login'); return }
    try {
      const r = await api.get(`/api/mobile/driver/${driver.id}/dashboard`)
      setData(r.data.data)
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchDashboard(retries - 1), 2000)
        return
      }
    } finally {
      setLoading(false)
    }
  }, [driver?.id])

  useEffect(() => { fetchDashboard() }, [])

  const handlePickup = async (harvestId: string) => {
    setActionLoading(harvestId)
    try {
      await api.patch(`/api/harvests/${harvestId}/pickup`, {})
      await fetchDashboard()
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update. Try again.')
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
      alert(err.response?.data?.error || 'Failed to update. Try again.')
    } finally {
      setActionLoading('')
    }
  }

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

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered_to_sacco: 'bg-orange-100 text-orange-700',
    graded: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-600 px-6 pt-12 pb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-200 text-sm">Driver Dashboard 🚗</p>
            <h1 className="text-white text-2xl font-black">
              {data?.driver?.fullName?.split(' ')[0]}
            </h1>
            <p className="text-blue-200 text-sm">{data?.driver?.vehicleReg}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="bg-blue-800 bg-opacity-50 text-white text-xs px-3 py-2 rounded-xl"
          >
            Logout
          </button>
        </div>

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

        {roles.includes('farmer') && (
          <button
            onClick={() => { setActiveRole('farmer'); navigate('/farmer') }}
            className="w-full bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌿</span>
              <div className="text-left">
                <p className="font-bold text-green-900">Switch to Farmer View</p>
                <p className="text-green-600 text-xs">View savings, loans & harvests</p>
              </div>
            </div>
            <span className="text-green-500">→</span>
          </button>
        )}

        <div className="flex gap-2">
          <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 rounded-xl text-sm font-bold ${activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            📦 Assigned ({assigned.length})
          </button>
          <button onClick={() => setActiveTab('completed')} className={`flex-1 py-3 rounded-xl text-sm font-bold ${activeTab === 'completed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            ✅ Completed ({completed.length})
          </button>
        </div>

        {activeTab === 'pending' && (
          <div className="space-y-4">
            {assigned.map((h: any) => (
              <div key={h.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                <div className="p-5">
                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/254${h.member.phoneNumber.slice(-9)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-green-500 text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-1"
                    >
                      💬 Chat
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex justify-around">
          <NavItem emoji="📦" label="Assigned" active={activeTab === 'pending'} onClick={() => setActiveTab('pending')} />
          <NavItem emoji="✅" label="Completed" active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} />
          <NavItem emoji="👤" label="Profile" active={false} onClick={() => navigate('/driver/profile')} />
        </div>
      </div>
    </div>
  )
}

function NavItem({ emoji, label, active, onClick }: {
  emoji: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1">
      <span className="text-xl">{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </button>
  )
}