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

  // ── Redirect if not authenticated ────────────────────────────────────────
  if (!agentData) { navigate('/login', { replace: true }); return null }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
        <span className="text-white text-3xl font-black">IG</span>
      </div>
      <Spinner size={8} />
      <p className="text-gray-500 text-sm">Loading agent dashboard...</p>
    </div>
  )

  // ── Error state ───────────────────────────────────────────────────────────
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

  // ── Quantity Modal ────────────────────────────────────────────────────────
  if (quantityHarvest) {
    const estKg = safeNum(quantityHarvest.estimatedWeightKg || quantityHarvest.estimated_weight_kg)
    const actualNum = safeNum(actualKg)
    const variance = actualNum > 0 && estKg > 0 ? actualNum - estKg : null

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
          <button onClick={() => { setQuantityHarvest(null); setActualKg(''); setAgentNotes(''); setActionError('') }} className="text-green-200 text-sm mb-4">← Cancel</button>
          <h1 className="text-xl font-black text-white">Record Harvest Quantity ⚖️</h1>
          <p className="text-green-200 text-sm">{safeStr(quantityHarvest.harvestNumber || quantityHarvest.harvest_number)}</p>
        </div>
        <div className="px-4 py-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-blue-700 mb-1">Farmer's Estimate</p>
            <p className="text-3xl font-black text-blue-800">{estKg > 0 ? `${estKg} kg` : 'No estimate'}</p>
            <p className="text-blue-600 text-xs">Farmer: {safeStr(quantityHarvest.member?.fullName || quantityHarvest.memberFullName)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-bold text-gray-700 mb-2">Actual Weight (kg) *</label>
            <input type="number" value={actualKg} onChange={e => setActualKg(e.target.value)}
              placeholder="e.g. 47.5" step="0.1" min="0.1" inputMode="decimal"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl font-black text-center focus:outline-none focus:border-green-500 bg-gray-50" />
            {variance !== null && (
              <div className={`rounded-xl p-3 mt-3 grid grid-cols-3 gap-2 text-center ${variance >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div><p className="text-xs text-gray-500">Estimated</p><p className="font-black text-blue-600">{estKg} kg</p></div>
                <div><p className="text-xs text-gray-500">Actual</p><p className="font-black text-gray-900">{actualKg} kg</p></div>
                <div><p className="text-xs text-gray-500">Variance</p><p className={`font-black ${variance>=0?'text-green-600':'text-red-500'}`}>{variance>=0?'+':''}{variance.toFixed(1)} kg</p></div>
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Notes (optional)</label>
              <textarea value={agentNotes} onChange={e => setAgentNotes(e.target.value)} rows={2}
                placeholder="Any observations..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm" />
            </div>
          </div>
          {actionError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">⚠️ {actionError}</div>}
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
            <p className="text-xs text-yellow-700">⚠️ This weight determines the farmer's payment. Ensure accuracy.</p>
          </div>
          <button onClick={handleRecordQuantity} disabled={quantityLoading || !actualKg || safeNum(actualKg) <= 0}
            className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-5 rounded-2xl text-xl flex items-center justify-center gap-2">
            {quantityLoading && <Spinner size={6} />}
            {quantityLoading ? 'Recording...' : `✅ Confirm ${actualKg ? actualKg+' kg' : ''}`}
          </button>
        </div>
      </div>
    )
  }

  // ── Grade Modal ───────────────────────────────────────────────────────────
  if (gradeHarvest) {
    const harvestNum = safeStr(gradeHarvest.harvestNumber || gradeHarvest.harvest_number)
    const memberName = safeStr(gradeHarvest.member?.fullName || gradeHarvest.memberFullName)
    const actualWeight = safeNum(gradeHarvest.actualWeightKg || gradeHarvest.actual_weight_kg)
    const totalGraded = gradeItems.reduce((sum, item) => sum + safeNum(item.weightKg), 0)
    const totalValue = gradeItems.reduce((sum, item) => sum + safeNum(item.weightKg) * safeNum(item.pricePerKg), 0)

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-teal-800 to-teal-600 px-5 pt-12 pb-6">
          <button onClick={() => { setGradeHarvest(null); setGradeError('') }} className="text-teal-200 text-sm mb-4">← Cancel</button>
          <h1 className="text-xl font-black text-white">Grade Miraa Harvest 🌿</h1>
          <p className="text-teal-200 text-sm">{harvestNum} · {memberName}</p>
          {actualWeight > 0 && <p className="text-teal-100 text-sm mt-1">Total Weight: {actualWeight} kg</p>}
        </div>
        <div className="px-4 py-5 space-y-4">
          {/* Current prices for reference */}
          {latestPrices.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
              <p className="text-xs font-bold text-green-800 mb-2">📊 Today's Reference Prices</p>
              <div className="grid grid-cols-3 gap-2">
                {latestPrices.map((price: any) => (
                  <div key={price.id} className="text-center">
                    <p className="text-xs text-gray-500">{safeStr(price.miraaGrade || price.miraa_grade)}</p>
                    <p className="font-black text-green-700 text-sm">KES {safeNum(price.buyingPrice || price.buying_price).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade input for each grade */}
          {gradeItems.map((item, idx) => {
            const subtotal = safeNum(item.weightKg) * safeNum(item.pricePerKg)
            // Pre-fill price from latest prices
            const matchPrice = latestPrices.find((p: any) => (p.miraaGrade || p.miraa_grade) === item.miraaGrade)
            return (
              <div key={item.miraaGrade} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${idx===0?'bg-green-500':idx===1?'bg-blue-500':'bg-orange-500'}`} />
                    <p className="font-black text-gray-900">{item.miraaGrade}</p>
                  </div>
                  {subtotal > 0 && (
                    <p className="text-sm font-black text-green-700">KES {subtotal.toLocaleString()}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Weight (kg)</label>
                    <input type="number" value={item.weightKg} min="0" step="0.1"
                      onChange={e => {
                        const updated = [...gradeItems]
                        updated[idx] = { ...updated[idx], weightKg: e.target.value }
                        setGradeItems(updated)
                      }}
                      placeholder="0.0"
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 text-sm bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Price/kg (KES)</label>
                    <input type="number" value={item.pricePerKg} min="0"
                      onChange={e => {
                        const updated = [...gradeItems]
                        updated[idx] = { ...updated[idx], pricePerKg: e.target.value }
                        setGradeItems(updated)
                      }}
                      placeholder={matchPrice ? String(safeNum(matchPrice.buyingPrice || matchPrice.buying_price)) : '0'}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-teal-500 text-sm bg-gray-50" />
                    {matchPrice && !item.pricePerKg && (
                      <button
                        onClick={() => {
                          const updated = [...gradeItems]
                          updated[idx] = { ...updated[idx], pricePerKg: String(safeNum(matchPrice.buyingPrice || matchPrice.buying_price)) }
                          setGradeItems(updated)
                        }}
                        className="text-xs text-teal-600 underline mt-1"
                      >
                        Use today's price
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Summary */}
          {totalValue > 0 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500">Total Graded</p>
                  <p className="font-black text-gray-900">{totalGraded.toFixed(1)} kg</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Payment</p>
                  <p className="font-black text-green-700 text-2xl">KES {totalValue.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {gradeError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">⚠️ {gradeError}</div>}

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
            <p className="text-xs text-blue-700">ℹ️ Grading is done by the agent overseeing the harvest. The SACCO will process payment based on these grades.</p>
          </div>

          <button onClick={handleSubmitGrades} disabled={gradeLoading || totalValue === 0}
            className="w-full bg-teal-600 disabled:bg-teal-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
            {gradeLoading && <Spinner size={5} />}
            {gradeLoading ? 'Submitting...' : `✅ Submit Grades — KES ${totalValue.toLocaleString()}`}
          </button>
        </div>
      </div>
    )
  }

  // ── Main Dashboard ────────────────────────────────────────────────────────
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
      </div>

      <div className="px-4 -mt-10 space-y-4">
        {/* Alerts */}
        {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">{successMsg}</div>}
        {actionError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between"><span>⚠️ {actionError}</span><button onClick={() => setActionError('')} className="font-bold">×</button></div>}

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('active')} className={`flex-1 py-3 rounded-2xl text-sm font-bold ${activeTab==='active'?'bg-blue-600 text-white':'bg-white text-gray-600 border border-gray-200'}`}>
            🌿 Active ({activeHarvests.length})
          </button>
          <button onClick={() => setActiveTab('completed')} className={`flex-1 py-3 rounded-2xl text-sm font-bold ${activeTab==='completed'?'bg-blue-600 text-white':'bg-white text-gray-600 border border-gray-200'}`}>
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
              activeHarvests.map((harvest: any) => {
                // Use 'harvest' variable — never 'h' to avoid scope conflicts
                const memberName = safeStr(harvest.member?.fullName || harvest.memberFullName)
                const memberPhone = safeStr(harvest.member?.phoneNumber || harvest.memberPhone)
                const memberVillage = safeStr(harvest.member?.village || harvest.memberVillage)
                const memberNumber = safeStr(harvest.member?.memberNumber || harvest.memberNumber)
                const harvestNum = safeStr(harvest.harvestNumber || harvest.harvest_number)
                const harvestDate = harvest.harvestDate || harvest.harvest_date
                const estKg = safeNum(harvest.estimatedWeightKg || harvest.estimated_weight_kg)
                const actKg = safeNum(harvest.actualWeightKg || harvest.actual_weight_kg)
                const varKg = harvest.weightVarianceKg ?? harvest.weight_variance_kg
                const farmLoc = safeStr(harvest.farmLocation || harvest.farm_location)

                return (
                  <div key={harvest.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                      <span className="font-black text-blue-700 text-sm">{harvestNum}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[harvest.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_LABEL[harvest.status] || safeStr(harvest.status).replace(/_/g,' ')}
                      </span>
                    </div>

                    <div className="p-4">
                      {/* Farmer info */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-black">{memberName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{memberName}</p>
                          <p className="text-gray-500 text-xs">{memberNumber} · {memberVillage}</p>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span>📅</span>
                          <span className="text-gray-700">
                            {harvestDate ? new Date(harvestDate).toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'long' }) : '—'}
                          </span>
                        </div>
                        {farmLoc && <div className="flex items-center gap-2 text-sm"><span>📍</span><span className="text-gray-700">{farmLoc}</span></div>}
                        {memberPhone && <div className="flex items-center gap-2 text-sm"><span>📞</span><a href={`tel:${memberPhone}`} className="text-blue-600 font-medium">{memberPhone}</a></div>}
                        {estKg > 0 && <div className="flex items-center gap-2 text-sm"><span>📊</span><span className="text-gray-700">Farmer estimates: <span className="font-bold text-blue-600">{estKg} kg</span></span></div>}
                      </div>

                      {/* Action buttons */}
                      <div className="space-y-2">
                        {harvest.status === 'confirmed' && (
                          <button onClick={() => handleStartHarvest(harvest.id)}
                            disabled={actionLoadingId === harvest.id}
                            className="w-full bg-yellow-500 disabled:bg-yellow-300 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                            {actionLoadingId === harvest.id ? <Spinner size={4} /> : '🌿'}
                            Start Harvesting
                          </button>
                        )}

                        {harvest.status === 'harvesting' && (
                          <button onClick={() => { setQuantityHarvest(harvest); setActualKg(''); setAgentNotes('') }}
                            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold text-sm">
                            ⚖️ Record Actual Quantity
                          </button>
                        )}

                        {harvest.status === 'picked_up' && (
                          <>
                            {/* Show recorded quantity */}
                            {actKg > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
                                <p className="text-xs font-bold text-green-800">✅ Quantity Recorded</p>
                                <div className="flex justify-between text-xs mt-1">
                                  <span className="text-gray-600">Est: {estKg > 0 ? estKg+' kg' : '—'}</span>
                                  <span className="font-bold text-green-700">Actual: {actKg} kg{varKg != null ? ` (${safeNum(varKg) >= 0 ? '+' : ''}${safeNum(varKg).toFixed(1)}kg)` : ''}</span>
                                </div>
                              </div>
                            )}
                            {/* Agent grades BEFORE delivering */}
                            <button onClick={() => { setGradeHarvest(harvest); setGradeError('') }}
                              className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold text-sm">
                              🌿 Grade Miraa (Set Grades & Prices)
                            </button>
                            <button onClick={() => handleDeliver(harvest.id)}
                              disabled={actionLoadingId === harvest.id}
                              className="w-full bg-orange-600 disabled:bg-orange-300 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                              {actionLoadingId === harvest.id ? <Spinner size={4} /> : '🏭'}
                              Deliver to SACCO
                            </button>
                          </>
                        )}

                        {harvest.status === 'delivered_to_sacco' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                            <p className="text-sm font-bold text-orange-800">🏭 Delivered to SACCO</p>
                            <p className="text-xs text-orange-600 mt-0.5">Awaiting SACCO payment processing</p>
                          </div>
                        )}

                        {memberPhone && (
                          <a href={`https://wa.me/254${memberPhone.replace(/^0/,'').slice(-9)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl font-bold text-sm">
                            💬 WhatsApp Farmer
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* COMPLETED HARVESTS */}
        {activeTab === 'completed' && (
          <div className="space-y-3">
            {completedHarvests.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-bold text-gray-900">No completed harvests yet</p>
              </div>
            ) : (
              completedHarvests.map((harvest: any) => {
                const memberName = safeStr(harvest.member?.fullName || harvest.memberFullName)
                const harvestNum = safeStr(harvest.harvestNumber || harvest.harvest_number)
                const actKg = safeNum(harvest.actualWeightKg || harvest.actual_weight_kg)
                const estKg = safeNum(harvest.estimatedWeightKg || harvest.estimated_weight_kg)
                const varKg = harvest.weightVarianceKg ?? harvest.weight_variance_kg
                const totalVal = safeNum(harvest.totalValue)

                return (
                  <div key={harvest.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{harvestNum}</p>
                        <p className="text-gray-500 text-xs">{memberName} · {safeStr(harvest.member?.village || harvest.memberVillage)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLOR[harvest.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABEL[harvest.status] || safeStr(harvest.status).replace(/_/g,' ')}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-center">
                      <div className="bg-gray-50 rounded-xl p-2"><p className="text-gray-400">Est.</p><p className="font-bold text-blue-600">{estKg > 0 ? estKg+' kg' : '—'}</p></div>
                      <div className="bg-gray-50 rounded-xl p-2"><p className="text-gray-400">Actual</p><p className="font-bold">{actKg > 0 ? actKg+' kg' : '—'}</p></div>
                      <div className="bg-gray-50 rounded-xl p-2"><p className="text-gray-400">Variance</p><p className={`font-bold ${safeNum(varKg)>=0?'text-green-600':'text-red-500'}`}>{varKg!=null?`${safeNum(varKg)>=0?'+':''}${safeNum(varKg).toFixed(1)} kg`:'—'}</p></div>
                    </div>
                    {totalVal > 0 && <p className="text-center font-black text-green-600 text-sm mt-2">KES {totalVal.toLocaleString()}</p>}
                  </div>
                )
              })
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
              <span className={`text-xl transition-transform ${item.active?'scale-110':''}`}>{item.emoji}</span>
              <span className={`text-xs font-medium ${item.active?'text-blue-600':'text-gray-400'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}