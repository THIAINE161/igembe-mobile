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
      <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
        <span className="text-white text-3xl font-black">IG</span>
      </div>
      <div className="flex items-center gap-3 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm font-medium">Loading your dashboard...</span>
      </div>
    </div>
  )

  const totalSavings = data?.totalSavings || 0
  const activeLoans = data?.activeLoans || []
  const recentHarvests = data?.recentHarvests || []
  const prices = data?.currentPrices || []

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

  const statusDescriptions: Record<string, string> = {
    scheduled: '⏳ Waiting for driver assignment',
    confirmed: '🚗 Driver assigned — pickup confirmed',
    picked_up: '📦 Driver has collected your miraa',
    delivered_to_sacco: '🏭 Delivered to SACCO — awaiting grading',
    graded: '✅ Graded — payment being processed',
    paid: '💰 Payment sent to your M-Pesa!',
  }

  const getProgressWidth = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'w-1/6',
      confirmed: 'w-2/6',
      picked_up: 'w-3/6',
      delivered_to_sacco: 'w-4/6',
      graded: 'w-5/6',
      paid: 'w-full',
    }
    return map[status] || 'w-0'
  }

  const getProgressColor = (status: string) => {
    const map: Record<string, string> = {
      scheduled: 'bg-yellow-400',
      confirmed: 'bg-blue-500',
      picked_up: 'bg-purple-500',
      delivered_to_sacco: 'bg-orange-500',
      graded: 'bg-teal-500',
      paid: 'bg-green-500',
    }
    return map[status] || 'bg-gray-300'
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ===== HEADER ===== */}
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-green-600 px-5 pt-12 pb-28 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white opacity-5 rounded-full transform -translate-x-10 translate-y-10" />

        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md">
              <span className="text-green-700 text-sm font-black">IG</span>
            </div>
            <div>
              <p className="text-green-200 text-xs">{greeting}</p>
              <h1 className="text-white text-xl font-black leading-tight">
                {data?.member?.fullName?.split(' ')[0]} 👋
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/farmer/profile')}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"
            >
              <span className="text-white text-sm">👤</span>
            </button>
            <button
              onClick={() => { logout(); navigate('/login') }}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"
            >
              <span className="text-white text-sm">🚪</span>
            </button>
          </div>
        </div>

        {/* Member info pill */}
        <div className="flex items-center gap-2 mb-5">
          <span className="bg-white bg-opacity-20 text-white text-xs px-3 py-1 rounded-full font-medium">
            🌿 {data?.member?.memberNumber}
          </span>
          {roles.includes('driver') && (
            <button
              onClick={() => { setActiveRole('driver'); navigate('/driver') }}
              className="bg-blue-500 bg-opacity-80 text-white text-xs px-3 py-1 rounded-full font-medium"
            >
              🚗 Switch to Driver
            </button>
          )}
        </div>

        {/* Balance Card */}
        <div className="bg-white bg-opacity-15 backdrop-blur rounded-3xl p-5 border border-white border-opacity-20">
          <p className="text-green-100 text-xs font-medium mb-1">Total Savings Balance</p>
          <p className="text-white text-4xl font-black mb-3">
            KES {totalSavings.toLocaleString()}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white bg-opacity-10 rounded-xl p-2 text-center">
              <p className="text-white text-lg font-black">{data?.savingsAccounts?.length || 0}</p>
              <p className="text-green-200 text-xs">Account(s)</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-xl p-2 text-center">
              <p className="text-white text-lg font-black">{activeLoans.length}</p>
              <p className="text-green-200 text-xs">Active Loan(s)</p>
            </div>
            <div className="bg-white bg-opacity-10 rounded-xl p-2 text-center">
              <p className="text-white text-lg font-black">{recentHarvests.length}</p>
              <p className="text-green-200 text-xs">Harvest(s)</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="px-4 -mt-16 space-y-4">

        {/* Quick Actions Grid */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Quick Actions</p>
          <div className="grid grid-cols-4 gap-3">
            <QuickAction emoji="📅" label="Schedule Pickup" color="bg-green-50 border-green-200" onClick={() => navigate('/farmer/harvest/new')} />
            <QuickAction emoji="🌿" label="My Harvests" color="bg-teal-50 border-teal-200" onClick={() => setActiveTab('harvests')} />
            <QuickAction emoji="💵" label="Savings" color="bg-blue-50 border-blue-200" onClick={() => setActiveTab('savings')} />
            <QuickAction emoji="💰" label="Loans" color="bg-purple-50 border-purple-200" onClick={() => setActiveTab('loans')} />
          </div>
        </div>

        {/* ===== TODAY'S MARKET PRICES ===== */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-gray-900">Today's Miraa Prices</p>
              <p className="text-xs text-gray-400">Set by Igembe SACCO</p>
            </div>
            <span className="text-2xl">🌿</span>
          </div>
          {prices.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-gray-400 text-sm">Prices not yet set today</p>
              <p className="text-gray-300 text-xs mt-1">Contact SACCO office for today's rates</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {prices.map((price: any) => {
                const gradeBg = price.miraaGrade === 'Grade 1'
                  ? 'from-green-600 to-green-500'
                  : price.miraaGrade === 'Grade 2'
                  ? 'from-teal-600 to-teal-500'
                  : 'from-orange-500 to-orange-400'
                return (
                  <div key={price.id}
                    className={`bg-gradient-to-br ${gradeBg} rounded-2xl p-4 text-white`}>
                    <p className="text-xs font-bold opacity-80 mb-1">{price.miraaGrade}</p>
                    <p className="text-2xl font-black leading-none">
                      {Number(price.buyingPrice).toLocaleString()}
                    </p>
                    <p className="text-xs opacity-70 mt-1">KES/kg</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ===== HOME TAB ===== */}
        {activeTab === 'home' && (
          <>
            {/* Active loan alert */}
            {activeLoans.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-3xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-orange-900 text-sm">Active Loan Reminder</p>
                  <p className="text-xs text-orange-700 mt-0.5">
                    Monthly payment: KES {Number(activeLoans[0].monthlyInstallment).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setActiveTab('loans')}
                  className="text-orange-600 text-xs font-bold">View →</button>
              </div>
            )}

            {/* Recent Harvests */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-black text-gray-900">Recent Harvests</p>
                  <p className="text-xs text-gray-400">Track your miraa pickups</p>
                </div>
                <button
                  onClick={() => navigate('/farmer/harvest/new')}
                  className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-bold"
                >
                  + Schedule
                </button>
              </div>

              {recentHarvests.length === 0 ? (
                <div className="bg-green-50 rounded-2xl p-6 text-center">
                  <p className="text-4xl mb-3">🌿</p>
                  <p className="font-bold text-gray-700 text-sm">No harvests yet</p>
                  <p className="text-gray-400 text-xs mt-1 mb-4">
                    Schedule your first pickup and we'll send a driver to your farm
                  </p>
                  <button
                    onClick={() => navigate('/farmer/harvest/new')}
                    className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                  >
                    Schedule First Pickup
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentHarvests.slice(0, 3).map((h: any) => {
                    const totalVal = h.items?.reduce(
                      (s: number, i: any) => s + Number(i.totalValue), 0) || 0
                    return (
                      <div key={h.id} className="border border-gray-100 rounded-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">🌿</span>
                            <span className="font-black text-sm text-gray-900">{h.harvestNumber}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${statusColors[h.status]}`}>
                            {h.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {/* Body */}
                        <div className="px-4 py-3">
                          <p className="text-xs text-gray-500 mb-2">
                            {statusDescriptions[h.status]}
                          </p>
                          {/* Progress */}
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                            <div className={`h-2 rounded-full transition-all ${getProgressColor(h.status)} ${getProgressWidth(h.status)}`} />
                          </div>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>📅 {new Date(h.harvestDate).toLocaleDateString('en-KE')}</span>
                            {totalVal > 0 && (
                              <span className="font-black text-green-600">
                                KES {totalVal.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {h.assignedDriver && (
                            <p className="text-xs text-blue-600 mt-1">🚗 {h.assignedDriver} · {h.vehicleReg}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {recentHarvests.length > 3 && (
                    <button
                      onClick={() => setActiveTab('harvests')}
                      className="w-full text-green-600 text-sm font-bold py-2 border border-green-200 rounded-xl hover:bg-green-50"
                    >
                      View all {recentHarvests.length} harvests →
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== HARVESTS TAB ===== */}
        {activeTab === 'harvests' && (
          <div className="bg-white rounded-3xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-gray-900">All My Harvests</p>
              <button
                onClick={() => navigate('/farmer/harvest/new')}
                className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-bold"
              >
                + Schedule
              </button>
            </div>
            {recentHarvests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-5xl mb-3">🌿</p>
                <p className="text-gray-500 font-medium">No harvests yet</p>
                <button onClick={() => navigate('/farmer/harvest/new')}
                  className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                  Schedule First Pickup
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentHarvests.map((h: any) => {
                  const totalVal = h.items?.reduce(
                    (s: number, i: any) => s + Number(i.totalValue), 0) || 0
                  return (
                    <div key={h.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="bg-gradient-to-r from-green-700 to-green-500 px-4 py-3 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-black">{h.harvestNumber}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize bg-white bg-opacity-20 text-white`}>
                          {h.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">📅 Date</span>
                          <span className="font-medium">{new Date(h.harvestDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        </div>
                        {h.farmLocation && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">📍 Location</span>
                            <span className="font-medium">{h.farmLocation}</span>
                          </div>
                        )}
                        {h.estimatedWeightKg && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">⚖️ Est. Weight</span>
                            <span className="font-medium">{h.estimatedWeightKg} kg</span>
                          </div>
                        )}
                        {h.assignedDriver && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">🚗 Driver</span>
                            <span className="font-medium text-blue-600">{h.assignedDriver}</span>
                          </div>
                        )}
                        <div className="bg-gray-50 rounded-xl p-3 mt-2">
                          <p className="text-xs text-gray-500 mb-1">Status Update</p>
                          <p className="text-sm font-medium text-gray-700">
                            {statusDescriptions[h.status]}
                          </p>
                        </div>
                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Scheduled</span>
                            <span>Picked Up</span>
                            <span>Paid ✓</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${getProgressColor(h.status)} ${getProgressWidth(h.status)}`} />
                          </div>
                        </div>
                        {/* Grading results */}
                        {h.items?.length > 0 && (
                          <div className="bg-green-50 rounded-xl p-3 mt-2">
                            <p className="text-xs font-bold text-green-800 mb-2">Grading Results:</p>
                            {h.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-xs text-green-700 mb-1">
                                <span>{item.miraaGrade}: {item.weightKg}kg × KES {Number(item.pricePerKg).toLocaleString()}/kg</span>
                                <span className="font-bold">KES {Number(item.totalValue).toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="border-t border-green-200 mt-2 pt-2 flex justify-between font-black text-green-800 text-sm">
                              <span>Total</span>
                              <span>KES {totalVal.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== SAVINGS TAB ===== */}
        {activeTab === 'savings' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <p className="font-black text-gray-900 mb-4">My Savings Accounts 💵</p>
              {!data?.savingsAccounts || data.savingsAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">💵</p>
                  <p className="text-gray-500 font-medium">No savings accounts yet</p>
                  <p className="text-gray-400 text-xs mt-1">Visit SACCO office to open an account</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.savingsAccounts.map((acc: any) => (
                    <div key={acc.id}
                      className="bg-gradient-to-br from-green-700 to-green-500 rounded-3xl p-5 text-white">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-green-100 text-xs">{acc.accountNumber}</p>
                          <p className="text-white font-bold capitalize mt-0.5">
                            {acc.accountType} Account
                          </p>
                        </div>
                        <div className="bg-white bg-opacity-20 rounded-xl px-2 py-1">
                          <p className="text-white text-xs font-bold">Active ✓</p>
                        </div>
                      </div>
                      <p className="text-4xl font-black">
                        KES {Number(acc.balance).toLocaleString()}
                      </p>
                      <p className="text-green-200 text-xs mt-1">Current Balance</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How to deposit */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <p className="font-black text-gray-900 mb-4">💡 How to Deposit Savings</p>
              <div className="space-y-3">
                {[
                  { step: 1, title: 'Send M-Pesa', desc: 'Send money to Igembe SACCO Paybill number' },
                  { step: 2, title: 'SACCO Records It', desc: 'Staff records your deposit with the M-Pesa code' },
                  { step: 3, title: 'Balance Updates', desc: 'Your balance shows here immediately' },
                ].map(item => (
                  <div key={item.step} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-gray-500 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-bold text-green-900 text-sm">Call SACCO Office</p>
                  <a href="tel:+254757630995" className="text-green-600 text-sm font-black">
                    +254 757 630 995
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== LOANS TAB ===== */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {activeLoans.length > 0 ? (
              <div className="bg-white rounded-3xl shadow-sm p-5">
                <p className="font-black text-gray-900 mb-4">My Active Loans 💰</p>
                <div className="space-y-4">
                  {activeLoans.map((loan: any) => {
                    const percent = Math.min(100,
                      Math.round((Number(loan.amountPaid) / Number(loan.totalPayable)) * 100)
                    )
                    return (
                      <div key={loan.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 flex justify-between items-center">
                          <span className="font-black text-gray-900">{loan.loanNumber}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${
                            loan.status === 'repaying' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                          }`}>{loan.status}</span>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gray-50 rounded-xl p-3">
                              <p className="text-xs text-gray-500">Principal</p>
                              <p className="font-black text-gray-900 text-sm">KES {Number(loan.principalAmount).toLocaleString()}</p>
                            </div>
                            <div className="bg-red-50 rounded-xl p-3">
                              <p className="text-xs text-red-500">Balance</p>
                              <p className="font-black text-red-600 text-sm">KES {Number(loan.balanceOutstanding).toLocaleString()}</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3">
                              <p className="text-xs text-green-500">Paid So Far</p>
                              <p className="font-black text-green-600 text-sm">KES {Number(loan.amountPaid).toLocaleString()}</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-3">
                              <p className="text-xs text-blue-500">Monthly</p>
                              <p className="font-black text-blue-600 text-sm">KES {Number(loan.monthlyInstallment).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Repayment Progress</span>
                              <span className="font-bold text-green-600">{percent}% paid</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-3">
                              <div className="bg-green-500 h-3 rounded-full transition-all"
                                style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                          {loan.dueDate && (
                            <p className="text-xs text-orange-600 font-medium">
                              📅 Due Date: {new Date(loan.dueDate).toLocaleDateString('en-KE')}
                            </p>
                          )}
                          <div className="mt-3 bg-yellow-50 rounded-xl p-3">
                            <p className="text-xs text-yellow-700">
                              💡 To make a repayment, visit the SACCO office or send M-Pesa and call us.
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm p-5">
                <p className="font-black text-gray-900 mb-4">Loans 💰</p>
                <div className="text-center py-6">
                  <p className="text-5xl mb-3">💰</p>
                  <p className="font-bold text-gray-900">No Active Loans</p>
                  <p className="text-gray-500 text-sm mt-1 mb-4">You have no active loans at the moment.</p>
                </div>
              </div>
            )}

            {/* How to apply */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <p className="font-black text-gray-900 mb-4">📋 How to Apply for a Loan</p>
              <div className="space-y-3">
                {[
                  { step: 1, title: 'Visit SACCO Office', desc: 'Come during working hours (Mon-Fri, 8am-5pm)' },
                  { step: 2, title: 'Bring Documents', desc: 'National ID, Member Number, guarantor details' },
                  { step: 3, title: 'Application Processed', desc: 'Reviewed and approved within 2-3 working days' },
                  { step: 4, title: 'Receive via M-Pesa', desc: 'Money sent directly to your M-Pesa number' },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-green-50 border border-green-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-green-800 mb-2">✅ Loan Requirements:</p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Active member for at least 3 months</li>
                  <li>• Minimum savings of KES 1,000</li>
                  <li>• Valid National ID</li>
                  <li>• One guarantor (fellow SACCO member)</li>
                  <li>• No existing defaulted loans</li>
                </ul>
              </div>
              <a href="tel:+254757630995"
                className="flex items-center gap-3 bg-green-600 rounded-2xl p-4 mt-4">
                <span className="text-2xl">📞</span>
                <div>
                  <p className="font-bold text-white text-sm">Call to Inquire</p>
                  <p className="text-green-200 text-xs">+254 757 630 995</p>
                </div>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ===== BOTTOM NAVIGATION ===== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 shadow-lg">
        <div className="flex items-center justify-around">
          <NavItem emoji="🏠" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem emoji="🌿" label="Harvests" active={activeTab === 'harvests'} onClick={() => setActiveTab('harvests')} />
          {/* Center FAB */}
          <div className="flex flex-col items-center -mt-8">
            <button
              onClick={() => navigate('/farmer/harvest/new')}
              className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white"
            >
              <span className="text-white text-3xl font-black">+</span>
            </button>
            <span className="text-xs text-gray-400 mt-1 font-medium">Schedule</span>
          </div>
          <NavItem emoji="💵" label="Savings" active={activeTab === 'savings'} onClick={() => setActiveTab('savings')} />
          <NavItem emoji="👤" label="Profile" active={false} onClick={() => navigate('/farmer/profile')} />
        </div>
      </div>
    </div>
  )
}

function QuickAction({ emoji, label, color, onClick }: {
  emoji: string; label: string; color: string; onClick: () => void
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${color} hover:opacity-80 transition-opacity`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  )
}

function NavItem({ emoji, label, active, onClick }: {
  emoji: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1 px-2">
      <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
    </button>
  )
}