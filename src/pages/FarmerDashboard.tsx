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
        <span className="text-sm font-medium">Loading dashboard...</span>
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

  const getProgressWidth = (status: string) => ({
    scheduled: 'w-1/6', confirmed: 'w-2/6', picked_up: 'w-3/6',
    delivered_to_sacco: 'w-4/6', graded: 'w-5/6', paid: 'w-full',
  }[status] || 'w-0')

  const getProgressColor = (status: string) => ({
    scheduled: 'bg-yellow-400', confirmed: 'bg-blue-500', picked_up: 'bg-purple-500',
    delivered_to_sacco: 'bg-orange-500', graded: 'bg-teal-500', paid: 'bg-green-500',
  }[status] || 'bg-gray-300')

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-green-600 px-5 pt-12 pb-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white opacity-5 rounded-full transform -translate-x-10 translate-y-10" />

        <div className="flex items-center justify-between mb-4">
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
            <button onClick={() => navigate('/farmer/profile')}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-lg">👤</span>
            </button>
            <button onClick={() => { logout(); navigate('/login') }}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-lg">🚪</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="bg-white bg-opacity-20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
            🌿 {data?.member?.memberNumber}
          </span>
          <span className="bg-white bg-opacity-20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
            📍 {data?.member?.village || 'Igembe'}
          </span>
          {roles.includes('driver') && (
            <button onClick={() => { setActiveRole('driver'); navigate('/driver') }}
              className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full font-bold">
              🚗 Driver View
            </button>
          )}
        </div>

        <div className="bg-white bg-opacity-15 backdrop-blur rounded-3xl p-5 border border-white border-opacity-20">
          <p className="text-green-100 text-xs font-medium mb-1">Total Savings Balance</p>
          <p className="text-white text-4xl font-black mb-4">
            KES {totalSavings.toLocaleString()}
          </p>

          {/* UPDATED GRID */}
          <div className="grid grid-cols-5 gap-2">
            <button onClick={() => setActiveTab('savings')}
              className="bg-white bg-opacity-10 rounded-xl p-2.5 text-center">
              <p className="text-white text-lg font-black">{data?.savingsAccounts?.length || 0}</p>
              <p className="text-green-200 text-xs">Accounts</p>
            </button>

            <button onClick={() => setActiveTab('loans')}
              className="bg-white bg-opacity-10 rounded-xl p-2.5 text-center">
              <p className="text-white text-lg font-black">{activeLoans.length}</p>
              <p className="text-green-200 text-xs">Loans</p>
            </button>

            <button onClick={() => setActiveTab('harvests')}
              className="bg-white bg-opacity-10 rounded-xl p-2.5 text-center">
              <p className="text-white text-lg font-black">{recentHarvests.length}</p>
              <p className="text-green-200 text-xs">Harvests</p>
            </button>

            {/* NEW AGROVET BUTTON */}
            <QuickAction emoji="🌱" label="AgroVet" color="bg-emerald-50 border-emerald-200"
              onClick={() => navigate('/farmer/agrovet')} />
          </div>
        </div>
      </div>

      {/* HARVESTS TAB */}
      {activeTab === 'harvests' && (
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <div className="space-y-4">
            {recentHarvests.map((h: any) => {
              const totalVal = h.items?.reduce(
                (s: number, i: any) => s + Number(i.totalValue), 0) || 0

              return (
                <div key={h.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="p-4">
                    {/* TOTAL */}
                    <div className="border-t border-green-200 mt-2 pt-2 flex justify-between font-black text-green-800">
                      <span>Total</span>
                      <span>KES {totalVal.toLocaleString()}</span>
                    </div>

                    {/* NEW BUTTON */}
                    {h.status === 'paid' && (
                      <button
                        onClick={() => navigate(`/farmer/harvest/${h.id}/invoice`)}
                        className="w-full mt-2 bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2"
                      >
                        📄 Download Invoice
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}