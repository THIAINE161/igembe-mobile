import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

// ===== HELPER COMPONENTS =====
function QuickActionBtn({ emoji, label, color, onClick }: {
  emoji: string; label: string; color: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${color} active:opacity-70`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  )
}

function BottomNavBtn({ emoji, label, active, onClick }: {
  emoji: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1 px-2">
      <span className={`text-xl ${active ? 'scale-110' : ''} transition-transform`}>{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
    </button>
  )
}

// ===== MAIN COMPONENT =====
export default function FarmerDashboard() {
  const navigate = useNavigate()
  const { member, roles, logout, setActiveRole } = useMobileStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'harvests' | 'savings' | 'loans'>('home')

  useEffect(() => {
    if (!member?.id) {
      navigate('/login')
      return
    }
    fetchDashboard()
  }, [member?.id])

  const fetchDashboard = async (retries = 3) => {
    try {
      const r = await api.get(`/api/mobile/farmer/${member!.id}/dashboard`)
      setData(r.data.data)
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchDashboard(retries - 1), 2000)
        return
      }
      console.error('Dashboard fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!member) return null

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
        <span className="text-white text-3xl font-black">IG</span>
      </div>
      <div className="flex items-center gap-3 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm font-medium">Loading dashboard...</span>
      </div>
    </div>
  )

  const totalSavings = data?.totalSavings || 0
  const activeLoans = data?.activeLoans || []
  const recentHarvests = data?.recentHarvests || []
  const prices = data?.currentPrices || []
  const savingsAccounts = data?.savingsAccounts || []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '🌅 Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening'

  const statusColors: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered_to_sacco: 'bg-orange-100 text-orange-700',
    graded: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
  }

  const statusDesc: Record<string, string> = {
    scheduled: '⏳ Waiting for driver assignment',
    confirmed: '🚗 Driver assigned — pickup confirmed',
    picked_up: '📦 Driver has collected your miraa',
    delivered_to_sacco: '🏭 Delivered — awaiting grading',
    graded: '✅ Graded — payment processing',
    paid: '💰 Payment sent to M-Pesa!',
  }

  const progressWidth: Record<string, string> = {
    scheduled: 'w-1/6', confirmed: 'w-2/6', picked_up: 'w-3/6',
    delivered_to_sacco: 'w-4/6', graded: 'w-5/6', paid: 'w-full',
  }

  const progressColor: Record<string, string> = {
    scheduled: 'bg-yellow-400', confirmed: 'bg-blue-500', picked_up: 'bg-purple-500',
    delivered_to_sacco: 'bg-orange-500', graded: 'bg-teal-500', paid: 'bg-green-500',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-green-600 px-5 pt-12 pb-28 relative overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-green-700 text-sm font-black">IG</span>
            </div>
            <div>
              <p className="text-green-200 text-xs">{greeting}</p>
              <h1 className="text-white text-xl font-black leading-tight">
                {member?.fullName?.split(' ')[0]} 👋
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/farmer/profile')}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"
            >
              <span className="text-lg">👤</span>
            </button>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"
            >
              <span className="text-lg">🚪</span>
            </button>
          </div>
        </div>

        {/* Pills (UPDATED) */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="bg-white bg-opacity-20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
            🌿 {member?.memberNumber}
          </span>
          {member?.village && (
            <span className="bg-white bg-opacity-20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
              📍 {member.village}
            </span>
          )}
          {roles.includes('agent') && (
            <button
              onClick={() => { setActiveRole('agent'); navigate('/agent') }}
              className="bg-blue-500 bg-opacity-90 text-white text-xs px-3 py-1.5 rounded-full font-bold active:opacity-80"
            >
              🧑‍🌾 Agent View
            </button>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-white bg-opacity-15 rounded-3xl p-5 border border-white border-opacity-20">
          <p className="text-green-100 text-xs font-medium mb-1">Total Savings Balance</p>
          <p className="text-white text-4xl font-black mb-4">
            KES {totalSavings.toLocaleString()}
          </p>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="px-4 -mt-16 space-y-4">

        {/* M-Pesa Payment Section */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
              <span className="text-xl">📱</span>
            </div>
            <div>
              <p className="font-black text-gray-900">M-Pesa Payments</p>
              <p className="text-xs text-gray-400">Send & receive money</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate('/farmer/mpesa/withdraw')}
              className="w-full bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💵</span>
                <div className="text-left">
                  <p className="font-bold text-green-900 text-sm">Withdraw Savings</p>
                </div>
              </div>
              <span className="text-green-500 font-bold">→</span>
            </button>
          </div>

          {/* SWITCH TO AGENT (ADDED) */}
          {roles.includes('agent') && (
            <button
              onClick={() => { setActiveRole('agent'); navigate('/agent') }}
              className="w-full mt-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🧑‍🌾</span>
                <div className="text-left">
                  <p className="font-bold text-blue-900 text-sm">Switch to Agent View</p>
                  <p className="text-blue-600 text-xs">Track harvest operations</p>
                </div>
              </div>
              <span className="text-blue-500 font-bold">→</span>
            </button>
          )}
        </div>

      </div>

    </div>
  )
}