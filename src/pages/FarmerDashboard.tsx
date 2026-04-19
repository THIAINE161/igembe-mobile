import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

// Safe number conversion
const num = (v: any) => Number(v) || 0
const str = (v: any) => String(v || '')

function QuickBtn({ emoji, label, color, onClick }: {
  emoji: string; label: string; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${color} active:opacity-70`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  )
}

function NavBtn({ emoji, label, active, onClick }: {
  emoji: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1 px-2">
      <span className={`text-xl ${active ? 'scale-110' : ''} transition-transform`}>{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
    </button>
  )
}

export default function FarmerDashboard() {
  const navigate = useNavigate()
  const { member, roles, logout, setActiveRole } = useMobileStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'harvests' | 'savings' | 'loans'>('home')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!member?.id) {
      navigate('/login', { replace: true })
      return
    }
    loadDashboard()

    const interval = setInterval(() => loadDashboard(false), 60000)
    return () => clearInterval(interval)
  }, [member?.id])

  const loadDashboard = async (showLoading = true) => {
    if (!member?.id) return
    if (showLoading) setLoading(true)
    setError('')
    try {
      const r = await api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      const responseData = r.data?.data
      if (!responseData) {
        setError('No dashboard data received. Please try again.')
        return
      }
      setData(responseData)
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Connection failed'
      console.error('Dashboard error:', msg)
      setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboard(false)
  }

  if (!member) {
    navigate('/login', { replace: true })
    return null
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center mb-4 shadow-xl">
        <span className="text-white text-3xl font-black">IG</span>
      </div>
      <svg className="animate-spin h-6 w-6 text-green-600 mb-3" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <p className="text-gray-500 text-sm">Loading your dashboard...</p>
    </div>
  )

  if (error && !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <p className="text-5xl mb-4">⚠️</p>
      <p className="font-bold text-gray-900 mb-2">Failed to load dashboard</p>
      <p className="text-gray-500 text-sm text-center mb-6">{error}</p>
      <button onClick={() => loadDashboard()}
        className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold">
        Try Again
      </button>
    </div>
  )

  const totalSavings = data?.totalSavings || 0
  const activeLoans = data?.activeLoans || []
  const recentHarvests = data?.recentHarvests || []
  const prices = data?.currentPrices || []
  const savingsAccounts = data?.savingsAccounts || []
  const shareCapital = data?.shareCapital || { units: 0, valuePerUnit: 100, totalValue: 0 }
  const announcements = data?.announcements || []
  const todayLimit = data?.todayLimit || null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '🌅 Good morning' : hour < 17 ? '☀️ Good afternoon' : '🌙 Good evening'

  const statusColors: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    harvesting: 'bg-lime-100 text-lime-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered_to_sacco: 'bg-orange-100 text-orange-700',
    graded: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
  }

  const statusDesc: Record<string, string> = {
    scheduled: '⏳ Waiting for agent assignment',
    confirmed: '🧑‍🌾 Agent assigned — coming to your farm',
    harvesting: '🌿 Agent currently harvesting your miraa',
    picked_up: '📦 Miraa collected — in transit to SACCO',
    delivered_to_sacco: '🏭 Arrived at SACCO — awaiting grading',
    graded: '✅ Graded — payment being processed',
    paid: '💰 Payment sent to your M-Pesa!',
  }

  const getProgressWidth = (status: string) => ({
    scheduled: 'w-1/6', confirmed: 'w-2/6', harvesting: 'w-3/6',
    picked_up: 'w-4/6', delivered_to_sacco: 'w-5/6', graded: 'w-5/6', paid: 'w-full'
  }[status] || 'w-0')

  const getProgressColor = (status: string) => ({
    scheduled: 'bg-yellow-400', confirmed: 'bg-blue-500', harvesting: 'bg-lime-500',
    picked_up: 'bg-purple-500', delivered_to_sacco: 'bg-orange-500',
    graded: 'bg-teal-500', paid: 'bg-green-500'
  }[status] || 'bg-gray-300')

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Rest of your UI remains EXACTLY unchanged */}
    </div>
  )
}