import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

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

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => loadDashboard(false), 60000)
    return () => clearInterval(interval)
  }, [member?.id])

  const loadDashboard = async (showLoading = true) => {
    if (!member?.id) return
    if (showLoading) setLoading(true)
    setError('')
    try {
      const r = await api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      if (r.data?.data) {
        setData(r.data.data)
      } else {
        setError('No data received. Please refresh.')
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to load dashboard'
      setError(msg)
      console.error('Dashboard error:', msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadDashboard(false)
  }

  // Redirect if not logged in
  if (!member) {
    navigate('/login', { replace: true })
    return null
  }

  // Loading screen
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

  // Error screen
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

      {/* HEADER */}
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-green-600 px-5 pt-12 pb-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white opacity-5 rounded-full transform -translate-x-10 translate-y-10" />

        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-green-700 text-sm font-black">IG</span>
            </div>
            <div>
              <p className="text-green-200 text-xs">{greeting}</p>
              <h1 className="text-white text-xl font-black">
                {member?.fullName?.split(' ')[0]} 👋
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={refreshing}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              {refreshing ? (
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : <span className="text-sm">🔄</span>}
            </button>
            <button onClick={() => navigate('/farmer/notifications')}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center relative">
              <span className="text-sm">🔔</span>
              {announcements.length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-black">{announcements.length}</span>
                </div>
              )}
            </button>
            <button onClick={() => navigate('/farmer/profile')}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              {data?.member?.profilePhotoUrl ? (
                <img src={data.member.profilePhotoUrl} alt="Profile"
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span className="text-white text-sm font-black">
                  {member?.fullName?.charAt(0)}
                </span>
              )}
            </button>
            <button onClick={() => { logout(); navigate('/login') }}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-sm">🚪</span>
            </button>
          </div>
        </div>

        {/* Pills */}
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
            <button onClick={() => { setActiveRole('agent'); navigate('/agent') }}
              className="bg-blue-500 bg-opacity-90 text-white text-xs px-3 py-1.5 rounded-full font-bold active:opacity-80">
              🧑‍🌾 Agent View
            </button>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-white bg-opacity-15 rounded-3xl p-5 border border-white border-opacity-20">
          <p className="text-green-100 text-xs font-medium mb-1">Total Savings Balance</p>
          <p className="text-white text-4xl font-black mb-1">
            KES {totalSavings.toLocaleString()}
          </p>
          {shareCapital.totalValue > 0 && (
            <p className="text-green-200 text-xs mb-3">
              📊 Share Capital: KES {shareCapital.totalValue.toLocaleString()}
            </p>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setActiveTab('savings')}
              className="bg-white bg-opacity-10 active:bg-opacity-20 rounded-xl p-2.5 text-center">
              <p className="text-white text-lg font-black">{savingsAccounts.length}</p>
              <p className="text-green-200 text-xs">Accounts</p>
            </button>
            <button onClick={() => setActiveTab('loans')}
              className="bg-white bg-opacity-10 active:bg-opacity-20 rounded-xl p-2.5 text-center">
              <p className="text-white text-lg font-black">{activeLoans.length}</p>
              <p className="text-green-200 text-xs">Loans</p>
            </button>
            <button onClick={() => setActiveTab('harvests')}
              className="bg-white bg-opacity-10 active:bg-opacity-20 rounded-xl p-2.5 text-center">
              <p className="text-white text-lg font-black">{recentHarvests.length}</p>
              <p className="text-green-200 text-xs">Harvests</p>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="px-4 -mt-16 space-y-4">

        {/* Announcements banner */}
        {announcements.length > 0 && (
          <button onClick={() => navigate('/farmer/notifications')}
            className={`w-full rounded-2xl p-4 flex items-center gap-3 text-left active:opacity-90 ${
              announcements[0]?.type === 'urgent' ? 'bg-red-50 border border-red-200' :
              announcements[0]?.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
            <span className="text-2xl flex-shrink-0">
              {announcements[0]?.type === 'urgent' ? '🚨' :
               announcements[0]?.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {announcements[0]?.title}
              </p>
              <p className="text-gray-600 text-xs truncate">{announcements[0]?.message}</p>
            </div>
            <span className="text-gray-400 font-bold flex-shrink-0">→</span>
          </button>
        )}

        {/* Harvest limit warning */}
        {todayLimit && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">⚖️</span>
            <div>
              <p className="font-bold text-orange-900 text-sm">Today's Harvest Limit</p>
              <p className="text-orange-700 text-xs">
                Max: {todayLimit.max_weight_kg ? `${todayLimit.max_weight_kg} kg` : ''}
                {todayLimit.max_bundles ? ` / ${todayLimit.max_bundles} bundles` : ''}
                {todayLimit.notes ? ` — ${todayLimit.notes}` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</p>
          <div className="grid grid-cols-4 gap-3">
            <QuickBtn emoji="📅" label="Schedule" color="bg-green-50 border-green-200" onClick={() => navigate('/farmer/harvest/new')} />
            <QuickBtn emoji="🌿" label="Harvests" color="bg-teal-50 border-teal-200" onClick={() => setActiveTab('harvests')} />
            <QuickBtn emoji="🌱" label="AgroVet" color="bg-emerald-50 border-emerald-200" onClick={() => navigate('/farmer/agrovet')} />
            <QuickBtn emoji="💰" label="Loans" color="bg-purple-50 border-purple-200" onClick={() => setActiveTab('loans')} />
          </div>
        </div>

        {/* Market Prices — always visible */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-gray-900">Today's Miraa Prices</p>
              <p className="text-xs text-gray-400">Set by Igembe SACCO</p>
            </div>
            <div className="bg-green-100 rounded-xl px-3 py-1.5">
              <span className="text-sm font-bold text-green-700">🌿 Live</span>
            </div>
          </div>
          {prices.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-gray-500 text-sm">Prices not set yet today</p>
              <a href="tel:+254757630995"
                className="inline-block mt-2 bg-green-600 text-white text-xs px-4 py-2 rounded-xl font-bold">
                📞 Call Office
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {prices.map((price: any) => {
                const gradients: Record<string, string> = {
                  'Grade 1': 'from-green-700 to-green-500',
                  'Grade 2': 'from-teal-700 to-teal-500',
                  'Gomba': 'from-orange-600 to-orange-400'
                }
                return (
                  <div key={price.id}
                    className={`bg-gradient-to-br ${gradients[price.miraaGrade] || 'from-gray-600 to-gray-500'} rounded-2xl p-4 text-white`}>
                    <p className="text-xs font-bold opacity-80 mb-1">{price.miraaGrade}</p>
                    <p className="text-2xl font-black">{Number(price.buyingPrice).toLocaleString()}</p>
                    <p className="text-xs opacity-70 mt-1">KES/kg</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <>
            {/* M-Pesa */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <p className="font-black text-gray-900 mb-3">📱 M-Pesa Payments</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => navigate('/farmer/mpesa/deposit')}
                  className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 active:bg-green-100">
                  <span className="text-2xl">📥</span>
                  <div className="text-left">
                    <p className="font-bold text-green-900 text-sm">Deposit</p>
                    <p className="text-green-600 text-xs">Add to savings</p>
                  </div>
                </button>
                <button onClick={() => navigate('/farmer/mpesa/withdraw')}
                  className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 active:bg-blue-100">
                  <span className="text-2xl">💸</span>
                  <div className="text-left">
                    <p className="font-bold text-blue-900 text-sm">Withdraw</p>
                    <p className="text-blue-600 text-xs">To M-Pesa</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Share Capital */}
            {shareCapital.totalValue > 0 && (
              <div className="bg-white rounded-3xl shadow-sm p-5">
                <p className="font-black text-gray-900 mb-3">📊 Share Capital</p>
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-4 text-white">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-indigo-200 text-xs mb-1">Units Held</p>
                      <p className="text-2xl font-black">{shareCapital.units || Math.floor(shareCapital.totalValue / shareCapital.valuePerUnit)}</p>
                    </div>
                    <div>
                      <p className="text-indigo-200 text-xs mb-1">Per Unit</p>
                      <p className="text-2xl font-black">KES {shareCapital.valuePerUnit}</p>
                    </div>
                    <div>
                      <p className="text-indigo-200 text-xs mb-1">Total Value</p>
                      <p className="text-xl font-black">KES {shareCapital.totalValue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loan alert */}
            {activeLoans.length > 0 && (
              <button onClick={() => setActiveTab('loans')}
                className="w-full bg-orange-50 border border-orange-200 rounded-3xl p-4 flex items-center gap-4 text-left active:bg-orange-100">
                <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-orange-900 text-sm">Active Loan Reminder</p>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Monthly: KES {Number(activeLoans[0]?.monthlyInstallment || 0).toLocaleString()} · Tap to view
                  </p>
                </div>
                <span className="text-orange-400 font-bold">→</span>
              </button>
            )}

            {/* Recent Harvests */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-black text-gray-900">Recent Harvests</p>
                  <p className="text-xs text-gray-400">Track your miraa pickups</p>
                </div>
                <button onClick={() => navigate('/farmer/harvest/new')}
                  className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-bold">
                  + Schedule
                </button>
              </div>

              {recentHarvests.length === 0 ? (
                <div className="bg-green-50 rounded-2xl p-6 text-center">
                  <p className="text-4xl mb-3">🌿</p>
                  <p className="font-bold text-gray-700 text-sm">No harvests yet</p>
                  <button onClick={() => navigate('/farmer/harvest/new')}
                    className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                    Schedule First Harvest
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentHarvests.slice(0, 3).map((h: any) => {
                    const totalVal = h.items?.reduce((s: number, i: any) => s + Number(i.totalValue), 0) || 0
                    return (
                      <div key={h.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span>🌿</span>
                            <span className="font-black text-sm">{h.harvestNumber}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${statusColors[h.status] || 'bg-gray-100 text-gray-600'}`}>
                            {h.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <p className="text-xs text-gray-500 mb-2">{statusDesc[h.status]}</p>
                          {h.agentName && (
                            <p className="text-xs text-blue-600 mb-1">
                              🧑‍🌾 Agent: {h.agentName}
                              {h.assignedAgent?.phoneNumber && (
                                <a href={`tel:${h.assignedAgent.phoneNumber}`} className="ml-2 text-blue-500">
                                  📞 Call
                                </a>
                              )}
                            </p>
                          )}
                          {h.estimatedWeightKg || h.actualWeightKg ? (
                            <div className="flex gap-3 text-xs mb-2">
                              <span className="text-gray-500">
                                Est: <span className="font-bold text-blue-600">{h.estimatedWeightKg || '—'} kg</span>
                              </span>
                              <span className="text-gray-500">
                                Actual: <span className="font-bold text-gray-900">{h.actualWeightKg || 'Pending'}{h.actualWeightKg ? ' kg' : ''}</span>
                              </span>
                              {h.weightVarianceKg != null && (
                                <span className={`font-bold ${Number(h.weightVarianceKg) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                  {Number(h.weightVarianceKg) >= 0 ? '+' : ''}{Number(h.weightVarianceKg).toFixed(1)} kg
                                </span>
                              )}
                            </div>
                          ) : null}
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                            <div className={`h-2 rounded-full ${getProgressColor(h.status)} ${getProgressWidth(h.status)}`} />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400">
                            <span>📅 {new Date(h.harvestDate).toLocaleDateString('en-KE')}</span>
                            {totalVal > 0 && <span className="font-black text-green-600">KES {totalVal.toLocaleString()}</span>}
                          </div>
                          {h.status === 'paid' && (
                            <button onClick={() => navigate(`/farmer/harvest/${h.id}/invoice`)}
                              className="w-full mt-2 bg-blue-600 text-white text-xs font-bold py-2 rounded-xl">
                              📄 View Invoice
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {recentHarvests.length > 3 && (
                    <button onClick={() => setActiveTab('harvests')}
                      className="w-full text-green-600 text-sm font-bold py-2 border border-green-200 rounded-xl">
                      View all {recentHarvests.length} harvests →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* AgroVet */}
            <button onClick={() => navigate('/farmer/agrovet')}
              className="w-full bg-white rounded-3xl shadow-sm p-5 flex items-center justify-between border border-gray-100 active:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
                <div className="text-left">
                  <p className="font-black text-gray-900">Igembe AgroVet</p>
                  <p className="text-gray-500 text-xs">Order farm inputs & supplies</p>
                </div>
              </div>
              <span className="text-green-600 font-bold text-lg">→</span>
            </button>
          </>
        )}

        {/* HARVESTS TAB */}
        {activeTab === 'harvests' && (
          <div className="bg-white rounded-3xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-gray-900">All My Harvests</p>
              <button onClick={() => navigate('/farmer/harvest/new')}
                className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-bold">
                + New
              </button>
            </div>
            {recentHarvests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-5xl mb-3">🌿</p>
                <p className="text-gray-500 font-medium">No harvests yet</p>
                <button onClick={() => navigate('/farmer/harvest/new')}
                  className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                  Schedule First Harvest
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentHarvests.map((h: any) => {
                  const totalVal = h.items?.reduce((s: number, i: any) => s + Number(i.totalValue), 0) || 0
                  return (
                    <div key={h.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="bg-gradient-to-r from-green-700 to-green-500 px-4 py-3 flex justify-between items-center">
                        <span className="font-black text-white">{h.harvestNumber}</span>
                        <span className="text-xs px-2 py-1 rounded-full font-bold bg-white bg-opacity-20 text-white capitalize">
                          {h.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">📅</span>
                          <span className="font-medium">
                            {new Date(h.harvestDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {h.farmLocation && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">📍</span>
                            <span>{h.farmLocation}</span>
                          </div>
                        )}

                        {/* Agent tracking */}
                        {h.agentName && (
                          <div className="bg-blue-50 rounded-xl p-3">
                            <p className="text-xs font-bold text-blue-800 mb-1">🧑‍🌾 Your Agent</p>
                            <p className="text-sm font-bold text-blue-900">{h.agentName}</p>
                            {h.assignedAgent?.phoneNumber && (
                              <div className="flex gap-2 mt-2">
                                <a href={`tel:${h.assignedAgent.phoneNumber}`}
                                  className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-xl text-center">
                                  📞 Call Agent
                                </a>
                                <a href={`https://wa.me/254${h.assignedAgent.phoneNumber.slice(-9)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="flex-1 bg-green-500 text-white text-xs font-bold py-2 rounded-xl text-center">
                                  💬 WhatsApp
                                </a>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Weight comparison */}
                        {(h.estimatedWeightKg || h.actualWeightKg) && (
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-gray-50 rounded-xl p-2">
                              <p className="text-xs text-gray-400">Your Estimate</p>
                              <p className="font-bold text-blue-600 text-sm">
                                {h.estimatedWeightKg ? `${h.estimatedWeightKg}kg` : '—'}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2">
                              <p className="text-xs text-gray-400">Actual</p>
                              <p className="font-bold text-gray-900 text-sm">
                                {h.actualWeightKg ? `${h.actualWeightKg}kg` : 'Pending'}
                              </p>
                            </div>
                            <div className="bg-gray-50 rounded-xl p-2">
                              <p className="text-xs text-gray-400">Variance</p>
                              <p className={`font-bold text-sm ${Number(h.weightVarianceKg) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {h.weightVarianceKg != null ? `${Number(h.weightVarianceKg) >= 0 ? '+' : ''}${Number(h.weightVarianceKg).toFixed(1)}kg` : '—'}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-400 mb-1">Status Update</p>
                          <p className="text-sm font-medium text-gray-700">{statusDesc[h.status]}</p>
                        </div>

                        {/* Progress */}
                        <div>
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Scheduled</span><span>Harvesting</span><span>Paid ✓</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${getProgressColor(h.status)} ${getProgressWidth(h.status)}`} />
                          </div>
                        </div>

                        {h.items?.length > 0 && (
                          <div className="bg-green-50 rounded-xl p-3">
                            <p className="text-xs font-bold text-green-800 mb-2">Payment Breakdown:</p>
                            {h.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-xs text-green-700 mb-1">
                                <span>{item.miraaGrade}: {item.weightKg}kg @ KES {Number(item.pricePerKg).toLocaleString()}</span>
                                <span className="font-bold">KES {Number(item.totalValue).toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="border-t border-green-200 mt-2 pt-2 flex justify-between font-black text-green-800">
                              <span>Total</span>
                              <span>KES {totalVal.toLocaleString()}</span>
                            </div>
                          </div>
                        )}

                        {h.status === 'paid' && (
                          <button onClick={() => navigate(`/farmer/harvest/${h.id}/invoice`)}
                            className="w-full bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl">
                            📄 View / Download Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SAVINGS TAB */}
        {activeTab === 'savings' && (
          <div className="space-y-4">
            {/* Share Capital Card */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <p className="font-black text-gray-900 mb-3">📊 Share Capital</p>
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-5 text-white mb-3">
                <p className="text-indigo-200 text-xs mb-1">Total Share Capital Value</p>
                <p className="text-3xl font-black">KES {shareCapital.totalValue.toLocaleString()}</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-white bg-opacity-15 rounded-xl p-2.5 text-center">
                    <p className="text-indigo-200 text-xs">Units</p>
                    <p className="text-xl font-black">{shareCapital.units || Math.floor(shareCapital.balance / shareCapital.valuePerUnit)}</p>
                  </div>
                  <div className="bg-white bg-opacity-15 rounded-xl p-2.5 text-center">
                    <p className="text-indigo-200 text-xs">Per Unit</p>
                    <p className="text-xl font-black">KES {shareCapital.valuePerUnit}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Accounts */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <p className="font-black text-gray-900 mb-4">💵 My Savings Accounts</p>
              {savingsAccounts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-4xl mb-3">💵</p>
                  <p className="text-gray-500 text-sm">No savings accounts yet</p>
                  <a href="tel:+254757630995"
                    className="inline-block mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                    📞 Call Office
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {savingsAccounts.map((acc: any) => (
                    <div key={acc.id} className="bg-gradient-to-br from-green-700 to-green-500 rounded-3xl p-5 text-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-green-100 text-xs">{acc.accountNumber}</p>
                          <p className="text-white font-bold capitalize mt-0.5">{acc.accountType} Account</p>
                        </div>
                        <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-1 rounded-lg font-bold">
                          Active ✓
                        </span>
                      </div>
                      <p className="text-3xl font-black">KES {Number(acc.balance).toLocaleString()}</p>
                      <p className="text-green-200 text-xs mt-1">Current Balance</p>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button onClick={() => navigate('/farmer/mpesa/deposit')}
                          className="bg-white bg-opacity-20 text-white text-sm font-bold py-2 rounded-xl active:bg-opacity-30">
                          📥 Deposit
                        </button>
                        <button onClick={() => navigate('/farmer/mpesa/withdraw')}
                          className="bg-white bg-opacity-20 text-white text-sm font-bold py-2 rounded-xl active:bg-opacity-30">
                          💸 Withdraw
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Harvest Payment Account */}
            {(data?.member?.harvestAccountBalance > 0 || data?.member?.harvestAccountNumber) && (
              <div className="bg-white rounded-3xl shadow-sm p-5">
                <p className="font-black text-gray-900 mb-3">🌿 Harvest Payment Account</p>
                <div className="bg-gradient-to-br from-teal-700 to-teal-500 rounded-2xl p-4 text-white">
                  <p className="text-teal-100 text-xs">{data?.member?.harvestAccountNumber}</p>
                  <p className="text-3xl font-black mt-1">
                    KES {Number(data?.member?.harvestAccountBalance || 0).toLocaleString()}
                  </p>
                  <p className="text-teal-200 text-xs mt-1">
                    Payments from miraa harvest sales
                  </p>
                  {(data?.member?.harvestAccountBalance || 0) > 0 && (
                    <button onClick={() => navigate('/farmer/mpesa/harvest-withdraw')}
                      className="mt-3 bg-white bg-opacity-20 text-white text-sm font-bold py-2 px-4 rounded-xl active:bg-opacity-30">
                      💸 Withdraw to M-Pesa
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOANS TAB */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {activeLoans.length > 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-5">
                <p className="font-black text-gray-900 mb-4">💰 My Active Loans</p>
                <div className="space-y-4">
                  {activeLoans.map((loan: any) => {
                    const paid = Number(loan.amountPaid) || 0
                    const total = Number(loan.totalPayable) || Number(loan.principalAmount) || 1
                    const percent = Math.min(100, Math.round((paid / total) * 100))
                    return (
                      <div key={loan.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                          <span className="font-black">{loan.loanNumber}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${
                            loan.status === 'repaying' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                          }`}>{loan.status}</span>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {[
                              { l: 'Principal', v: `KES ${Number(loan.principalAmount).toLocaleString()}`, c: 'bg-gray-50' },
                              { l: 'Balance', v: `KES ${Number(loan.balanceOutstanding).toLocaleString()}`, c: 'bg-red-50' },
                              { l: 'Paid', v: `KES ${paid.toLocaleString()}`, c: 'bg-green-50' },
                              { l: 'Monthly', v: `KES ${Number(loan.monthlyInstallment).toLocaleString()}`, c: 'bg-blue-50' },
                            ].map((item, i) => (
                              <div key={i} className={`${item.c} rounded-xl p-3`}>
                                <p className="text-xs text-gray-500">{item.l}</p>
                                <p className="font-black text-sm">{item.v}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span className="font-bold text-green-600">{percent}% paid</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                              <div className="bg-green-500 h-3 rounded-full" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                          {loan.dueDate && (
                            <p className="text-xs text-orange-600 mb-3">
                              📅 Due: {new Date(loan.dueDate).toLocaleDateString('en-KE')}
                            </p>
                          )}
                          <button onClick={() => navigate('/farmer/mpesa/repay')}
                            className="w-full bg-green-600 text-white text-sm font-bold py-3 rounded-xl">
                            📱 Repay via M-Pesa
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm p-6 text-center">
                <p className="text-5xl mb-3">💰</p>
                <p className="font-bold text-gray-900">No Active Loans</p>
                <p className="text-gray-500 text-sm mt-1">You have no active loans.</p>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-sm p-5">
              <p className="font-black text-gray-900 mb-4">📋 How to Apply for a Loan</p>
              <div className="space-y-3 mb-4">
                {[
                  { n: 1, t: 'Visit SACCO Office', d: 'Mon–Fri, 8am–5pm' },
                  { n: 2, t: 'Bring Documents', d: 'National ID + Member No. + guarantor' },
                  { n: 3, t: 'Reviewed in 2–3 Days', d: 'We notify you by SMS' },
                  { n: 4, t: 'Receive via M-Pesa', d: 'Money sent directly to your phone' },
                ].map(item => (
                  <div key={item.n} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">
                      {item.n}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.t}</p>
                      <p className="text-gray-500 text-xs">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 mb-3">
                <p className="text-xs font-bold text-green-800 mb-1">✅ Requirements:</p>
                <p className="text-xs text-green-700">Active member 3+ months · Min savings KES 1,000 · National ID · Guarantor</p>
              </div>
              <a href="tel:+254757630995"
                className="flex items-center gap-3 bg-green-600 rounded-2xl p-4 text-white">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-bold text-sm">Call to Inquire</p>
                  <p className="text-green-200 text-xs">+254 757 630 995</p>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 shadow-lg">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <NavBtn emoji="🏠" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavBtn emoji="🌿" label="Harvests" active={activeTab === 'harvests'} onClick={() => setActiveTab('harvests')} />
          <div className="flex flex-col items-center -mt-8">
            <button onClick={() => navigate('/farmer/harvest/new')}
              className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white active:bg-green-700">
              <span className="text-white text-3xl font-black">+</span>
            </button>
            <span className="text-xs text-gray-400 mt-1">Schedule</span>
          </div>
          <NavBtn emoji="💵" label="Savings" active={activeTab === 'savings'} onClick={() => setActiveTab('savings')} />
          <NavBtn emoji="👤" label="Profile" active={false} onClick={() => navigate('/farmer/profile')} />
        </div>
      </div>
    </div>
  )
}