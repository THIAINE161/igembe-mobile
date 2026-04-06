import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function FarmerDashboard() {
  const navigate = useNavigate()
  const { member, roles, logout, setActiveRole } = useMobileStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'harvests' | 'savings' | 'loans'>('home')

  const fetchDashboard = useCallback(async (retries = 3) => {
    if (!member?.id) { navigate('/login'); return }
    try {
      const r = await api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      setData(r.data.data)
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchDashboard(retries - 1), 2000)
        return
      }
    } finally {
      setLoading(false)
    }
  }, [member?.id])

  useEffect(() => { fetchDashboard() }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
        <span className="text-white text-2xl font-black">IG</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm">Loading dashboard...</span>
      </div>
    </div>
  )

  const totalSavings = data?.totalSavings || 0
  const activeLoans = data?.activeLoans || []
  const recentHarvests = data?.recentHarvests || []
  const prices = data?.currentPrices || []

  const statusColors: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered_to_sacco: 'bg-orange-100 text-orange-700',
    graded: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
  }

  const statusDescriptions: Record<string, string> = {
    scheduled: '⏳ Waiting for driver assignment',
    confirmed: '🚗 Driver assigned — pickup confirmed',
    picked_up: '📦 Driver has picked up your miraa',
    delivered_to_sacco: '🏭 Miraa delivered to SACCO',
    graded: '✅ Miraa graded — awaiting payment',
    paid: '💰 Payment sent to your M-Pesa!',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-green-700 to-green-600 px-6 pt-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-green-200 text-sm">
              {new Date().getHours() < 12 ? '🌅 Good morning' :
               new Date().getHours() < 17 ? '☀️ Good afternoon' : '🌙 Good evening'}
            </p>
            <h1 className="text-white text-2xl font-black">
              {data?.member?.fullName?.split(' ')[0]} 👋
            </h1>
            <p className="text-green-200 text-sm">{data?.member?.memberNumber}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="bg-green-800 bg-opacity-50 text-white text-xs px-3 py-2 rounded-xl">
            Logout
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white bg-opacity-15 rounded-2xl p-5 text-white">
          <p className="text-green-100 text-sm mb-1">Total Savings Balance</p>
          <p className="text-4xl font-black">KES {totalSavings.toLocaleString()}</p>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-green-200">
              📊 {data?.savingsAccounts?.length || 0} account(s)
            </span>
            {activeLoans.length > 0 && (
              <span className="text-green-200">
                💰 {activeLoans.length} active loan(s)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-16 space-y-4">

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            <MobileAction emoji="📅" label="Schedule Pickup" onClick={() => navigate('/farmer/harvest/new')} color="bg-green-50" />
            <MobileAction emoji="🌿" label="My Harvests" onClick={() => setActiveTab('harvests')} color="bg-teal-50" />
            <MobileAction emoji="💵" label="My Savings" onClick={() => setActiveTab('savings')} color="bg-blue-50" />
            <MobileAction emoji="💰" label="Loans" onClick={() => setActiveTab('loans')} color="bg-purple-50" />
          </div>
        </div>

        {/* Switch to Driver */}
        {roles.includes('driver') && (
          <button onClick={() => { setActiveRole('driver'); navigate('/driver') }}
            className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <div className="text-left">
                <p className="font-bold text-blue-900 text-sm">Switch to Driver View</p>
                <p className="text-blue-600 text-xs">View & confirm assigned pickups</p>
              </div>
            </div>
            <span className="text-blue-500 font-bold">→</span>
          </button>
        )}

        {/* ALL OTHER CONTENT REMAINS UNCHANGED */}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex justify-around">
          <NavItem emoji="🏠" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem emoji="🌿" label="Harvests" active={activeTab === 'harvests'} onClick={() => setActiveTab('harvests')} />
          <div className="flex flex-col items-center -mt-6">
            <button onClick={() => navigate('/farmer/harvest/new')}
              className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
              <span className="text-white text-2xl font-black">+</span>
            </button>
            <span className="text-xs text-gray-500 mt-1">Schedule</span>
          </div>
          <NavItem emoji="💵" label="Savings" active={activeTab === 'savings'} onClick={() => setActiveTab('savings')} />
          <NavItem emoji="👤" label="Profile" active={false} onClick={() => navigate('/farmer/profile')} />
        </div>
      </div>
    </div>
  )
}

function MobileAction({ emoji, label, onClick, color }: {
  emoji: string; label: string; onClick: () => void; color: string
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl ${color} hover:opacity-80`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  )
}

function NavItem({ emoji, label, active, onClick }: {
  emoji: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1">
      <span className="text-xl">{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </button>
  )
}