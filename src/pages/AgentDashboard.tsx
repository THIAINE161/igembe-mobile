import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

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

export default function AgentDashboard() {
  const navigate = useNavigate()
  const { agent, driver, roles, logout, setActiveRole } = useMobileStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const [actionLoading, setActionLoading] = useState('')
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [selectedHarvest, setSelectedHarvest] = useState<any>(null)
  const [actualKg, setActualKg] = useState('')
  const [agentNotes, setAgentNotes] = useState('')
  const [quantityLoading, setQuantityLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [actionError, setActionError] = useState('')

  const [showGradeModal, setShowGradeModal] = useState(false)
  const [gradeHarvest, setGradeHarvest] = useState<any>(null)
  const [gradeItems, setGradeItems] = useState([
    { miraaGrade: 'Grade 1', weightKg: '', pricePerKg: '' },
    { miraaGrade: 'Grade 2', weightKg: '', pricePerKg: '' },
    { miraaGrade: 'Gomba', weightKg: '', pricePerKg: '' },
  ])
  const [gradeLoading, setGradeLoading] = useState(false)
  const [gradeError, setGradeError] = useState('')

  const agentData = agent || driver

  useEffect(() => {
    if (!agentData?.id) {
      navigate('/login', { replace: true })
      return
    }
    loadDashboard()
    const interval = setInterval(() => loadDashboard(false), 90_000)
    return () => clearInterval(interval)
  }, [agentData?.id])

  const loadDashboard = async (showSpinner = true) => {
    if (!agentData?.id) return
    if (showSpinner) setLoading(true)
    else setRefreshing(true)
    setError('')

    try {
      const r = await api.get(`/api/mobile/agent/${agentData.id}/dashboard`)
      if (r?.data?.data) {
        setData(r.data.data)
      } else {
        setError('No data received')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to load'
      if (showSpinner) setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleStartHarvest = async (harvestId: string) => {
    setActionLoading(harvestId)
    setActionError('')
    try {
      await api.patch(`/api/harvests/${harvestId}/start-harvest`, {})
      showSuccess('Harvesting started! 🌿')
      await loadDashboard(false)
    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoading('')
    }
  }

  const handleRecordQuantity = async () => {
    if (!actualKg || Number(actualKg) <= 0) {
      setActionError('Enter a valid weight in kg')
      return
    }
    if (!selectedHarvest) return
    setQuantityLoading(true)
    setActionError('')
    try {
      await api.patch(`/api/harvests/${selectedHarvest.id}/record-quantity`, {
        actualWeightKg: Number(actualKg),
        agentNotes: agentNotes || undefined
      })
      setShowQuantityModal(false)
      setActualKg('')
      setAgentNotes('')
      setSelectedHarvest(null)
      showSuccess('Quantity recorded! Miraa in transit to SACCO. ✅')
      await loadDashboard(false)
    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed to record quantity')
    } finally {
      setQuantityLoading(false)
    }
  }

  const handleDeliver = async (harvestId: string) => {
    setActionLoading(harvestId)
    setActionError('')
    try {
      await api.patch(`/api/harvests/${harvestId}/deliver`, {})
      showSuccess('Delivered to SACCO! ✅')
      await loadDashboard(false)
    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoading('')
    }
  }

  const handleSubmitGrades = async () => {
    const valid = gradeItems.filter(
      i => i.weightKg && i.pricePerKg && Number(i.weightKg) > 0
    )

    if (!valid.length) {
      setGradeError('Add at least one grade with weight and price')
      return
    }

    if (!gradeHarvest) return

    setGradeLoading(true)
    setGradeError('')

    try {
      await api.post(`/api/harvests/${gradeHarvest.id}/grade`, {
        items: valid.map(i => ({
          miraaGrade: i.miraaGrade,
          weightKg: Number(i.weightKg),
          pricePerKg: Number(i.pricePerKg)
        })),
        gradedBy: agentData?.fullName || 'Agent'
      })

      setShowGradeModal(false)
      setGradeHarvest(null)

      showSuccess(
        `Grades submitted for ${
          gradeHarvest.harvestNumber || gradeHarvest.harvest_number
        }! ✅`
      )

      await loadDashboard(false)
    } catch (e: any) {
      setGradeError(
        e?.response?.data?.error || 'Failed to submit grades'
      )
    } finally {
      setGradeLoading(false)
    }
  }

  if (!agentData) {
    navigate('/login', { replace: true })
    return null
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
        <span className="text-white text-3xl font-black">IG</span>
      </div>
      <Spinner size={8} />
      <p className="text-gray-500 text-sm">Loading agent dashboard…</p>
    </div>
  )

  if (error && !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 gap-4">
      <p className="text-5xl">⚠️</p>
      <p className="font-bold text-gray-900">Failed to load dashboard</p>
      <p className="text-gray-500 text-sm text-center">{error}</p>
      <div className="flex gap-3">
        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-bold"
        >
          Logout
        </button>

        <button
          onClick={() => loadDashboard()}
          className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold"
        >
          Try Again
        </button>
      </div>
    </div>
  )

  const active = data?.activeHarvests || []
  const completed = data?.completedHarvests || []
  const stats = data?.stats || {}
  const agentInfo = data?.agent || agentData
  // Quantity modal
  if (showQuantityModal && selectedHarvest) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button
          onClick={() => {
            setShowQuantityModal(false)
            setActualKg('')
            setAgentNotes('')
            setActionError('')
          }}
          className="text-green-200 text-sm mb-4"
        >
          ← Cancel
        </button>
        <h1 className="text-xl font-black text-white">Record Harvest Quantity ⚖️</h1>
        <p className="text-green-200 text-sm mt-1">
          {selectedHarvest.harvestNumber || selectedHarvest.harvest_number}
        </p>
      </div>

      <div className="px-4 py-5 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-700 mb-2">📊 Farmer's Estimate</p>
          <p className="text-3xl font-black text-blue-800">
            {(selectedHarvest.estimatedWeightKg || selectedHarvest.estimated_weight_kg)
              ? `${selectedHarvest.estimatedWeightKg || selectedHarvest.estimated_weight_kg} kg`
              : 'No estimate provided'}
          </p>
          <p className="text-blue-600 text-xs mt-1">
            Farmer: {selectedHarvest.member?.fullName || selectedHarvest.memberFullName}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Actual Weight (kg) *
          </label>
          <input
            type="number"
            value={actualKg}
            onChange={e => setActualKg(e.target.value)}
            placeholder="e.g. 47.5"
            step="0.1"
            min="0.1"
            inputMode="decimal"
            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl font-black text-center focus:outline-none focus:border-green-500 bg-gray-50"
          />

          {actualKg && (selectedHarvest.estimatedWeightKg || selectedHarvest.estimated_weight_kg) && (
            <div className={`rounded-xl p-3 mt-3 ${
              Number(actualKg) >= Number(selectedHarvest.estimatedWeightKg || selectedHarvest.estimated_weight_kg)
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Estimated</p>
                  <p className="font-black text-blue-600">
                    {selectedHarvest.estimatedWeightKg || selectedHarvest.estimated_weight_kg} kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Actual</p>
                  <p className="font-black text-gray-900">{actualKg} kg</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Variance</p>
                  <p className={`font-black ${
                    Number(actualKg) >= Number(selectedHarvest.estimatedWeightKg || selectedHarvest.estimated_weight_kg)
                      ? 'text-green-600'
                      : 'text-red-500'
                  }`}>
                    {Number(actualKg) >= Number(selectedHarvest.estimatedWeightKg || selectedHarvest.estimated_weight_kg) ? '+' : ''}
                    {(Number(actualKg) - Number(selectedHarvest.estimatedWeightKg || selectedHarvest.estimated_weight_kg)).toFixed(1)} kg
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📝 Notes (optional)
            </label>
            <textarea
              value={agentNotes}
              onChange={e => setAgentNotes(e.target.value)}
              placeholder="Any observations about the harvest..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
            />
          </div>
        </div>

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {actionError}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
          <p className="text-xs text-yellow-700">
            ⚠️ This quantity will be used to calculate the farmer's payment. Ensure it is accurate.
          </p>
        </div>

        <button
          onClick={handleRecordQuantity}
          disabled={quantityLoading || !actualKg || Number(actualKg) <= 0}
          className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-5 rounded-2xl text-xl flex items-center justify-center gap-2"
        >
          {quantityLoading ? <Spinner size={6} /> : null}
          {quantityLoading ? 'Recording...' : `✅ Confirm ${actualKg ? actualKg + ' kg' : 'Quantity'}`}
        </button>
      </div>
    </div>
  )

  // Grade modal
  if (showGradeModal && gradeHarvest) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-teal-700 to-teal-500 px-5 pt-12 pb-6">
        <button
          onClick={() => {
            setShowGradeModal(false)
            setGradeError('')
          }}
          className="text-teal-100 text-sm mb-4"
        >
          ← Cancel
        </button>
        <h1 className="text-xl font-black text-white">Grade Harvest 🧪</h1>
        <p className="text-teal-100 text-sm mt-1">
          {gradeHarvest.harvestNumber || gradeHarvest.harvest_number}
        </p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {gradeItems.map((item, idx) => (
          <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="font-bold text-gray-800">{item.miraaGrade}</p>

            <input
              type="number"
              placeholder="Weight (kg)"
              value={item.weightKg}
              onChange={e => {
                const updated = [...gradeItems]
                updated[idx].weightKg = e.target.value
                setGradeItems(updated)
              }}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3"
            />

            <input
              type="number"
              placeholder="Price per kg"
              value={item.pricePerKg}
              onChange={e => {
                const updated = [...gradeItems]
                updated[idx].pricePerKg = e.target.value
                setGradeItems(updated)
              }}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3"
            />
          </div>
        ))}

        {gradeError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {gradeError}
          </div>
        )}

        <button
          onClick={handleSubmitGrades}
          disabled={gradeLoading}
          className="w-full bg-teal-600 text-white py-5 rounded-2xl font-black text-xl"
        >
          {gradeLoading ? 'Submitting...' : '✅ Submit Grades'}
        </button>
      </div>
    </div>
  )

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
                {(agentInfo?.fullName || '').split(' ')[0]} 👋
              </h1>
              <p className="text-blue-200 text-xs">{agentInfo?.agentCode || ''}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => loadDashboard(false)}
              disabled={refreshing}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"
            >
              {refreshing ? <Spinner size={4} /> : <span className="text-sm">🔄</span>}
            </button>

            <button onClick={() => navigate('/agent/notifications')}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-sm">🔔</span>
            </button>

            <button onClick={() => navigate('/agent/profile')}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">
                {(agentInfo?.fullName || '?').charAt(0)}
              </span>
            </button>

            <button onClick={() => { logout(); navigate('/login') }}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-sm">🚪</span>
            </button>
          </div>
        </div>

        {roles.includes('farmer') && (
          <button
            onClick={() => { setActiveRole('farmer'); navigate('/farmer') }}
            className="mb-4 bg-green-500 bg-opacity-80 text-white text-xs px-3 py-1.5 rounded-full font-bold"
          >
            🌿 Switch to Farmer View
          </button>
        )}

        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Assigned', value: stats.confirmed || 0, color: 'text-blue-200' },
            { label: 'Harvesting', value: stats.harvesting || 0, color: 'text-yellow-200' },
            { label: 'In Transit', value: stats.inTransit || 0, color: 'text-purple-200' },
            { label: 'Done', value: stats.totalCompleted || 0, color: 'text-green-200' },
          ].map(s => (
            <div key={s.label} className="bg-white bg-opacity-15 rounded-xl p-2.5 text-center">
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className={`text-xs ${s.color}`}>{s.label}</p>
            </div>
          ))}
        </div>
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

        <div className="flex gap-2">
          <button onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${activeTab === 'active' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            🌿 Active ({active.length})
          </button>

          <button onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${activeTab === 'completed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            ✅ Completed ({completed.length})
          </button>
        </div>

        {/* ACTIVE + COMPLETED + BOTTOM NAV remain exactly your original code,
            except this updated delivered_to_sacco block: */}

        {h.status === 'delivered_to_sacco' && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-orange-800">🏭 Delivered to SACCO</p>
              <p className="text-xs text-orange-600 mt-0.5">Ready for grading</p>
            </div>

            <button
              onClick={() => {
                setGradeHarvest(h)
                setShowGradeModal(true)
                setGradeError('')
              }}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold text-sm"
            >
              🧪 Grade Harvest
            </button>
          </>
        )}
      </div>
    </div>
  )
}