import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

// ── helpers ──────────────────────────────────────────────────────────────────
const safeNum = (v: any) => (v == null ? 0 : Number(v) || 0)
const safeStr = (v: any) => (v == null ? '' : String(v))

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} text-blue-600`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  harvesting: 'bg-yellow-100 text-yellow-700',
  picked_up: 'bg-purple-100 text-purple-700',
  delivered_to_sacco: 'bg-orange-100 text-orange-700',
  graded: 'bg-teal-100 text-teal-700',
  paid: 'bg-green-100 text-green-700',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Agent Assigned',
  harvesting: 'Harvesting',
  picked_up: 'In Transit',
  delivered_to_sacco: 'At SACCO',
  graded: 'Graded',
  paid: 'Paid',
}

export default function AgentDashboard() {
  const navigate = useNavigate()
  const { agent, driver, roles, logout, setActiveRole } = useMobileStore()
  const agentData = agent || driver

  const [dashData, setDashData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'active'|'completed'>('active')

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState('')
  const [actionError, setActionError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Quantity modal
  const [quantityHarvest, setQuantityHarvest] = useState<any>(null)
  const [actualKg, setActualKg] = useState('')
  const [agentNotes, setAgentNotes] = useState('')
  const [quantityLoading, setQuantityLoading] = useState(false)

  // Grade modal
  const [gradeHarvest, setGradeHarvest] = useState<any>(null)
  const [gradeItems, setGradeItems] = useState([
    { miraaGrade: 'Grade 1', weightKg: '', pricePerKg: '' },
    { miraaGrade: 'Grade 2', weightKg: '', pricePerKg: '' },
    { miraaGrade: 'Gomba', weightKg: '', pricePerKg: '' },
  ])
  const [gradeLoading, setGradeLoading] = useState(false)
  const [gradeError, setGradeError] = useState('')
  const [latestPrices, setLatestPrices] = useState<any[]>([])

  useEffect(() => {
    if (!agentData?.id) { navigate('/login', { replace: true }); return }
    loadDashboard()
    loadPrices()
    const interval = setInterval(() => loadDashboard(false), 90_000)
    return () => clearInterval(interval)
  }, [agentData?.id])

  const loadDashboard = async (showSpinner = true) => {
    if (!agentData?.id) return
    if (showSpinner) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const res = await api.get(`/api/mobile/agent/${agentData.id}/dashboard`)
      if (res?.data?.data) {
        setDashData(res.data.data)
      } else {
        throw new Error('Empty response from server')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load'
      if (showSpinner) setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadPrices = async () => {
    try {
      const res = await api.get('/api/market-prices/latest')
      setLatestPrices(res.data.data || [])
    } catch (_) {}
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  const handleStartHarvest = async (harvestId: string) => {
    setActionLoadingId(harvestId)
    setActionError('')
    try {
      await api.patch(`/api/harvests/${harvestId}/start-harvest`, {})
      showSuccess('Harvesting started! 🌿')
      await loadDashboard(false)
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoadingId('')
    }
  }

  const handleRecordQuantity = async () => {
    if (!quantityHarvest) return
    if (!actualKg || safeNum(actualKg) <= 0) { setActionError('Enter valid weight'); return }
    setQuantityLoading(true)
    setActionError('')
    try {
      await api.patch(`/api/harvests/${quantityHarvest.id}/record-quantity`, {
        actualWeightKg: safeNum(actualKg),
        agentNotes: agentNotes || undefined
      })
      setQuantityHarvest(null)
      setActualKg('')
      setAgentNotes('')
      showSuccess('Quantity recorded! ✅')
      await loadDashboard(false)
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed')
    } finally {
      setQuantityLoading(false)
    }
  }

  const handleDeliver = async (harvestId: string) => {
    setActionLoadingId(harvestId)
    setActionError('')
    try {
      await api.patch(`/api/harvests/${harvestId}/deliver`, {})
      showSuccess('Delivered to SACCO! ✅')
      await loadDashboard(false)
    } catch (err: any) {
      setActionError(err?.response?.data?.error || 'Failed')
    } finally {
      setActionLoadingId('')
    }
  }
    const handleSubmitGrades = async () => {
    if (!gradeHarvest) return
    const validGrades = gradeItems.filter(item =>
      item.weightKg && item.pricePerKg &&
      safeNum(item.weightKg) > 0 && safeNum(item.pricePerKg) > 0
    )
    if (!validGrades.length) { setGradeError('Enter weight and price for at least one grade'); return }
    setGradeLoading(true)
    setGradeError('')
    try {
      await api.post(`/api/harvests/${gradeHarvest.id}/grade`, {
        items: validGrades.map(item => ({
          miraaGrade: item.miraaGrade,
          weightKg: safeNum(item.weightKg),
          pricePerKg: safeNum(item.pricePerKg)
        })),
        gradedBy: safeStr(agentData?.fullName) || 'Agent'
      })
      setGradeHarvest(null)
      setGradeItems([
        { miraaGrade: 'Grade 1', weightKg: '', pricePerKg: '' },
        { miraaGrade: 'Grade 2', weightKg: '', pricePerKg: '' },
        { miraaGrade: 'Gomba', weightKg: '', pricePerKg: '' },
      ])
      showSuccess('Miraa graded successfully! Payment will be processed. ✅')
      await loadDashboard(false)
    } catch (err: any) {
      setGradeError(err?.response?.data?.error || 'Failed to submit grades')
    } finally {
      setGradeLoading(false)
    }
  }

  if (!agentData) { navigate('/login', { replace: true }); return null }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
        <span className="text-white text-3xl font-black">IG</span>
      </div>
      <Spinner size={8} />
      <p className="text-gray-500 text-sm">Loading agent dashboard...</p>
    </div>
  )

  if (error && !dashData) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 gap-4">
      <p className="text-5xl">⚠️</p>
      <p className="font-bold text-gray-900">Failed to load dashboard</p>
      <p className="text-gray-500 text-sm text-center">{error}</p>
      <div className="flex gap-3">
        <button onClick={() => { logout(); navigate('/login') }} className="border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-bold">Logout</button>
        <button onClick={() => loadDashboard()} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold">Try Again</button>
      </div>
    </div>
  )

  const activeHarvests: any[] = dashData?.activeHarvests || []
  const completedHarvests: any[] = dashData?.completedHarvests || []
  const stats = dashData?.stats || {}
  const agentInfo = dashData?.agent || agentData

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 px-5 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full translate-x-10 -translate-y-10" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center">
              <span className="text-blue-700 text-sm font-black">IG</span>
            </div>
            <div>
              <p className="text-blue-200 text-xs">🌿 Harvest Agent</p>
              <h1 className="text-white text-xl font-black">
                {safeStr(agentInfo?.fullName || '').split(' ')[0]} 👋
              </h1>
              <p className="text-blue-200 text-xs">{safeStr(agentInfo?.agentCode)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => loadDashboard(false)} disabled={refreshing}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              {refreshing ? <Spinner size={4} /> : <span className="text-sm">🔄</span>}
            </button>
            {roles?.includes('farmer') && (
              <button onClick={() => { setActiveRole('farmer'); navigate('/farmer') }}
                className="w-9 h-9 bg-green-500 bg-opacity-80 rounded-xl flex items-center justify-center">
                <span className="text-sm">🌿</span>
              </button>
            )}
            <button onClick={() => { logout(); navigate('/login') }}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-sm">🚪</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Assigned', value: stats.confirmed || 0 },
            { label: 'Harvesting', value: stats.harvesting || 0 },
            { label: 'In Transit', value: stats.inTransit || 0 },
            { label: 'Done', value: stats.totalCompleted || 0 },
          ].map(stat => (
            <div key={stat.label} className="bg-white bg-opacity-15 rounded-xl p-2.5 text-center">
              <p className="text-xl font-black text-white">{stat.value}</p>
              <p className="text-blue-200 text-xs">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Today's Miraa Prices */}
        {latestPrices.length > 0 && (
          <div className="mt-3 bg-white bg-opacity-15 rounded-2xl p-3">
            <p className="text-blue-100 text-xs font-bold mb-2">📊 Today's Miraa Prices</p>
            <div className="grid grid-cols-3 gap-2">
              {latestPrices.map((price: any) => (
                <div key={price.id || price.miraaGrade} className="text-center">
                  <p className="text-blue-200 text-xs">{price.miraaGrade || price.miraa_grade}</p>
                  <p className="text-white font-black text-sm">
                    KES {Number(price.buyingPrice || price.buying_price).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
            <div className="px-4 -mt-10 space-y-4">

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
            {successMsg}
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
            <span>⚠️ {actionError}</span>
            <button onClick={() => setActionError('')} className="font-bold">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            🌿 Active ({activeHarvests.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            ✅ Done ({completedHarvests.length})
          </button>
        </div>

        {/* ACTIVE HARVESTS */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeHarvests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">✅</p>
                <p className="font-bold text-gray-900">No active assignments!</p>
                <p className="text-gray-500 text-sm mt-1">All caught up 🎉</p>
              </div>
            ) : (
              activeHarvests.map((harvest: any) => (
                <div key={harvest.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                  <p className="font-black text-gray-900">
                    {safeStr(harvest.harvestNumber || harvest.harvest_number)}
                  </p>

                  <p className="text-sm text-gray-500 mt-1">
                    {safeStr(harvest.member?.fullName || harvest.memberFullName)}
                  </p>

                  <div className="mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[harvest.status] || 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABEL[harvest.status] || safeStr(harvest.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* COMPLETED */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            {completedHarvests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-bold text-gray-900">No completed harvests yet</p>
              </div>
            ) : (
              completedHarvests.map((harvest: any) => (
                <div key={harvest.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">
                        {safeStr(harvest.harvestNumber || harvest.harvest_number)}
                      </p>
                    </div>

                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[harvest.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[harvest.status] || safeStr(harvest.status).replace(/_/g,' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
        <div className="flex justify-around max-w-lg mx-auto">
          {[
            { emoji: '🌿', label: 'Active', onClick: () => setActiveTab('active'), active: activeTab==='active' },
            { emoji: '✅', label: 'Done', onClick: () => setActiveTab('completed'), active: activeTab==='completed' },
            { emoji: '👤', label: 'Profile', onClick: () => navigate('/agent/profile'), active: false },
          ].map(item => (
            <button key={item.label} onClick={item.onClick} className="flex flex-col items-center gap-1">
              <span className={`text-xl transition-transform ${item.active?'scale-110':''}`}>
                {item.emoji}
              </span>
              <span className={`text-xs font-medium ${item.active?'text-blue-600':'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}