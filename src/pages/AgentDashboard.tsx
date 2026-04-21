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

  // Redirect if not agent
  if (!agentData) { navigate('/login', { replace: true }); return null }

  // Loading
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
        <span className="text-white text-3xl font-black">IG</span>
      </div>
      <Spinner size={8} />
      <p className="text-gray-500 text-sm">Loading agent dashboard…</p>
    </div>
  )

  // Error
  if (error && !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 gap-4">
      <p className="text-5xl">⚠️</p>
      <p className="font-bold text-gray-900">Failed to load dashboard</p>
      <p className="text-gray-500 text-sm text-center">{error}</p>
      <div className="flex gap-3">
        <button onClick={() => { logout(); navigate('/login') }}
          className="border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-bold">
          Logout
        </button>
        <button onClick={() => loadDashboard()}
          className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold">
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
        <button onClick={() => { setShowQuantityModal(false); setActualKg(''); setAgentNotes(''); setActionError('') }}
          className="text-green-200 text-sm mb-4">← Cancel</button>
        <h1 className="text-xl font-black text-white">Record Harvest Quantity ⚖️</h1>
        <p className="text-green-200 text-sm mt-1">{selectedHarvest.harvestNumber || selectedHarvest.harvest_number}</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Farmer's estimate */}
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

        {/* Actual quantity */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Actual Weight (kg) *
          </label>
          <input
            type="number" value={actualKg}
            onChange={e => setActualKg(e.target.value)}
            placeholder="e.g. 47.5"
            step="0.1" min="0.1" inputMode="decimal"
            className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl font-black text-center focus:outline-none focus:border-green-500 bg-gray-50"
          />

          {/* Live variance */}
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
                      ? 'text-green-600' : 'text-red-500'
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
            <textarea value={agentNotes} onChange={e => setAgentNotes(e.target.value)}
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
            <button onClick={() => loadDashboard(false)} disabled={refreshing}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
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

        {/* Switch to farmer if dual role */}
        {roles.includes('farmer') && (
          <button
            onClick={() => { setActiveRole('farmer'); navigate('/farmer') }}
            className="mb-4 bg-green-500 bg-opacity-80 text-white text-xs px-3 py-1.5 rounded-full font-bold"
          >
            🌿 Switch to Farmer View
          </button>
        )}

        {/* Stats */}
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

        {/* Success/Error */}
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
          <button onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${activeTab === 'active' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            🌿 Active ({active.length})
          </button>
          <button onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${activeTab === 'completed' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            ✅ Completed ({completed.length})
          </button>
        </div>

        {/* ACTIVE HARVESTS */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {active.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">✅</p>
                <p className="font-bold text-gray-900">No active assignments!</p>
                <p className="text-gray-500 text-sm mt-1">You are all caught up 🎉</p>
              </div>
            ) : (
              active.map((h: any) => {
                const memberName = h.member?.fullName || h.memberFullName || '—'
                const memberPhone = h.member?.phoneNumber || h.memberPhone || ''
                const memberVillage = h.member?.village || h.memberVillage || ''
                const memberNumber = h.member?.memberNumber || h.memberNumber || ''
                const harvestNumber = h.harvestNumber || h.harvest_number
                const harvestDate = h.harvestDate || h.harvest_date
                const estimated = h.estimatedWeightKg ?? h.estimated_weight_kg

                return (
                  <div key={h.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    {/* Card header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                      <span className="font-black text-blue-700">{harvestNumber}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${STATUS_COLOR[h.status] || 'bg-gray-100 text-gray-700'}`}>
                        {(h.status || '').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="p-4">
                      {/* Farmer info */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-green-700 font-black text-sm">{memberName.charAt(0)}</span>
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
                            {harvestDate ? new Date(harvestDate).toLocaleDateString('en-KE', {
                              weekday: 'long', day: 'numeric', month: 'long'
                            }) : '—'}
                          </span>
                        </div>
                        {(h.farmLocation || h.farm_location) && (
                          <div className="flex items-center gap-2 text-sm">
                            <span>📍</span>
                            <span className="text-gray-700">{h.farmLocation || h.farm_location}</span>
                          </div>
                        )}
                        {memberPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <span>📞</span>
                            <a href={`tel:${memberPhone}`} className="text-blue-600 font-medium">{memberPhone}</a>
                          </div>
                        )}
                        {estimated && (
                          <div className="flex items-center gap-2 text-sm">
                            <span>📊</span>
                            <span className="text-gray-700">
                              Farmer estimates: <span className="font-bold text-blue-600">{estimated} kg</span>
                            </span>
                          </div>
                        )}
                        {(h.notes || h.agent_notes) && (
                          <div className="flex items-start gap-2 text-xs">
                            <span>📝</span>
                            <span className="text-gray-600">{h.notes || h.agent_notes}</span>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="space-y-2">
                        {h.status === 'confirmed' && (
                          <button
                            onClick={() => handleStartHarvest(h.id)}
                            disabled={actionLoading === h.id}
                            className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                          >
                            {actionLoading === h.id ? <Spinner size={4} /> : '🌿'}
                            Start Harvesting
                          </button>
                        )}

                        {h.status === 'harvesting' && (
                          <button
                            onClick={() => {
                              setSelectedHarvest(h)
                              setShowQuantityModal(true)
                              setActualKg('')
                              setAgentNotes('')
                              setActionError('')
                            }}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-sm"
                          >
                            ⚖️ Record Actual Quantity
                          </button>
                        )}

                        {h.status === 'picked_up' && (
                          <>
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
                              <p className="text-xs font-bold text-green-800 mb-1">✅ Quantity Recorded</p>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">Est: {estimated || '—'} kg</span>
                                <span className="font-bold text-green-700">
                                  Actual: {h.actualWeightKg || h.actual_weight_kg} kg
                                  {(h.weightVarianceKg ?? h.weight_variance_kg) != null && (
                                    <span className={`ml-1 ${Number(h.weightVarianceKg ?? h.weight_variance_kg) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                      ({Number(h.weightVarianceKg ?? h.weight_variance_kg) >= 0 ? '+' : ''}{Number(h.weightVarianceKg ?? h.weight_variance_kg).toFixed(1)} kg)
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeliver(h.id)}
                              disabled={actionLoading === h.id}
                              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                            >
                              {actionLoading === h.id ? <Spinner size={4} /> : '🏭'}
                              Deliver to SACCO
                            </button>
                          </>
                        )}

                        {h.status === 'delivered_to_sacco' && (
                          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                            <p className="text-sm font-bold text-orange-800">🏭 Delivered to SACCO</p>
                            <p className="text-xs text-orange-600 mt-0.5">Awaiting grading by SACCO staff</p>
                          </div>
                        )}

                        {/* WhatsApp farmer */}
                        {memberPhone && (
                          <a href={`https://wa.me/254${memberPhone.slice(-9)}`}
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
            {completed.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-bold text-gray-900">No completed harvests yet</p>
              </div>
            ) : (
              completed.map((h: any) => {
                const memberName = h.member?.fullName || h.memberFullName || '—'
                const memberVillage = h.member?.village || h.memberVillage || ''
                const memberNumber = h.member?.memberNumber || h.memberNumber || ''
                const harvestNumber = h.harvestNumber || h.harvest_number
                const totalVal = Number(h.totalValue || 0)

                return (
                  <div key={h.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{harvestNumber}</p>
                        <p className="text-gray-500 text-xs">{memberName} · {memberVillage}</p>
                        <p className="text-gray-400 text-xs">{memberNumber}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${STATUS_COLOR[h.status] || 'bg-gray-100 text-gray-600'}`}>
                        {(h.status || '').replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-gray-400">Estimated</p>
                        <p className="font-bold text-blue-600">
                          {(h.estimatedWeightKg || h.estimated_weight_kg) ? `${h.estimatedWeightKg || h.estimated_weight_kg} kg` : '—'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-gray-400">Actual</p>
                        <p className="font-bold text-gray-900">
                          {(h.actualWeightKg || h.actual_weight_kg) ? `${h.actualWeightKg || h.actual_weight_kg} kg` : '—'}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-gray-400">Variance</p>
                        <p className={`font-bold ${Number(h.weightVarianceKg ?? h.weight_variance_kg) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {(h.weightVarianceKg ?? h.weight_variance_kg) != null
                            ? `${Number(h.weightVarianceKg ?? h.weight_variance_kg) >= 0 ? '+' : ''}${Number(h.weightVarianceKg ?? h.weight_variance_kg).toFixed(1)} kg`
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {totalVal > 0 && (
                      <div className="mt-2 text-center">
                        <p className="font-black text-green-600 text-sm">
                          Farmer Payment: KES {totalVal.toLocaleString()}
                        </p>
                      </div>
                    )}
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
            { emoji: '🌿', label: 'Active', tab: 'active' },
            { emoji: '✅', label: 'Done', tab: 'completed' },
          ].map(item => (
            <button key={item.tab} onClick={() => setActiveTab(item.tab as any)}
              className="flex flex-col items-center gap-1">
              <span className={`text-xl ${activeTab === item.tab ? 'scale-110' : ''} transition-transform`}>
                {item.emoji}
              </span>
              <span className={`text-xs font-medium ${activeTab === item.tab ? 'text-blue-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          ))}
          <button onClick={() => navigate('/agent/profile')}
            className="flex flex-col items-center gap-1">
            <span className="text-xl">👤</span>
            <span className="text-xs font-medium text-gray-400">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}