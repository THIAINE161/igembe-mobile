import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

function AgentNavBtn({ emoji, label, active, onClick }: {
  emoji: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1 px-3">
      <span className="text-xl">{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
    </button>
  )
}

export default function AgentDashboard() {
  const navigate = useNavigate()
  const { agent, roles, logout, setActiveRole } = useMobileStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const [selectedHarvest, setSelectedHarvest] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState('')
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [actualKg, setActualKg] = useState('')
  const [agentNotes, setAgentNotes] = useState('')
  const [quantityLoading, setQuantityLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (!agent?.id) { navigate('/login'); return }
    fetchDashboard()
  }, [agent?.id])

  const fetchDashboard = async (retries = 3) => {
    try {
      const r = await api.get(`/api/mobile/agent/${agent!.id}/dashboard`)
      setData(r.data.data)
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchDashboard(retries - 1), 2000)
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const handleStartHarvest = async (harvestId: string) => {
    setActionLoading(harvestId)
    try {
      await api.patch(`/api/harvests/${harvestId}/start-harvest`, {})
      await fetchDashboard()
      setSuccessMsg('Harvesting started!')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoading('')
    }
  }

  const handleRecordQuantity = async () => {
    if (!actualKg || Number(actualKg) <= 0) {
      setError('Please enter a valid weight in kg')
      return
    }
    if (!selectedHarvest) return
    setQuantityLoading(true)
    setError('')
    try {
      await api.patch(`/api/harvests/${selectedHarvest.id}/record-quantity`, {
        actualWeightKg: Number(actualKg),
        agentNotes
      })
      setShowQuantityModal(false)
      setActualKg('')
      setAgentNotes('')
      setSelectedHarvest(null)
      await fetchDashboard()
      setSuccessMsg('Quantity recorded! Miraa is now in transit to SACCO.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record quantity')
    } finally {
      setQuantityLoading(false)
    }
  }

  const handleDeliver = async (harvestId: string) => {
    setActionLoading(harvestId)
    try {
      await api.patch(`/api/harvests/${harvestId}/deliver`, {})
      await fetchDashboard()
      setSuccessMsg('Delivered to SACCO! ✅')
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoading('')
    }
  }

  if (!agent) return null

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-white text-2xl">🌿</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm">Loading agent dashboard...</span>
      </div>
    </div>
  )

  const active = data?.activeHarvests || []
  const completed = data?.completedHarvests || []
  const stats = data?.stats || {}

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    harvesting: 'bg-yellow-100 text-yellow-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered_to_sacco: 'bg-orange-100 text-orange-700',
    graded: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
  }

  const statusDesc: Record<string, string> = {
    confirmed: 'Ready to harvest — tap to start',
    harvesting: 'Currently harvesting',
    picked_up: 'Harvested — record quantity then deliver',
    delivered_to_sacco: 'Delivered to SACCO',
    graded: 'Graded by SACCO',
    paid: 'Payment sent to farmer',
  }

  // Quantity Recording Modal
  if (showQuantityModal && selectedHarvest) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => { setShowQuantityModal(false); setActualKg(''); setAgentNotes(''); setError('') }}
          className="text-green-200 text-sm mb-4">← Cancel</button>
        <h1 className="text-xl font-black text-white">Record Harvest Quantity</h1>
        <p className="text-green-200 text-sm mt-1">{selectedHarvest.harvestNumber}</p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* Farmer prediction */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-700 mb-2">📊 Farmer's Estimate</p>
          <p className="text-3xl font-black text-blue-800">
            {selectedHarvest.estimatedWeightKg
              ? `${selectedHarvest.estimatedWeightKg} kg`
              : 'No estimate provided'
            }
          </p>
          <p className="text-blue-600 text-xs mt-1">
            Farmer: {selectedHarvest.member?.fullName} · {selectedHarvest.member?.village}
          </p>
        </div>

        {/* Actual quantity input */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-black text-gray-900 mb-4">⚖️ Enter Actual Harvested Quantity</p>

          <div className="mb-4">
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
          </div>

          {/* Show variance in real time */}
          {actualKg && selectedHarvest.estimatedWeightKg && (
            <div className={`rounded-xl p-4 mb-4 ${
              Number(actualKg) > Number(selectedHarvest.estimatedWeightKg)
                ? 'bg-green-50 border border-green-200'
                : Number(actualKg) < Number(selectedHarvest.estimatedWeightKg)
                ? 'bg-red-50 border border-red-200'
                : 'bg-gray-50 border border-gray-200'
            }`}>
              <p className="text-xs font-bold mb-1">
                {Number(actualKg) > Number(selectedHarvest.estimatedWeightKg)
                  ? '✅ Above estimate'
                  : Number(actualKg) < Number(selectedHarvest.estimatedWeightKg)
                  ? '⬇️ Below estimate'
                  : '✅ Exact estimate'
                }
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Estimated</p>
                  <p className="font-black text-blue-600">{selectedHarvest.estimatedWeightKg} kg</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Actual</p>
                  <p className="font-black text-gray-900">{actualKg} kg</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Variance</p>
                  <p className={`font-black ${
                    Number(actualKg) >= Number(selectedHarvest.estimatedWeightKg)
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {Number(actualKg) >= Number(selectedHarvest.estimatedWeightKg) ? '+' : ''}
                    {(Number(actualKg) - Number(selectedHarvest.estimatedWeightKg)).toFixed(1)} kg
                  </p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📝 Agent Notes (optional)
            </label>
            <textarea
              value={agentNotes}
              onChange={e => setAgentNotes(e.target.value)}
              placeholder="Any observations about the harvest quality, conditions, etc..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <p className="text-xs text-yellow-700">
            ⚠️ <span className="font-bold">Important:</span> This quantity will be used to calculate the farmer's payment.
            Please ensure it is accurate and verified before submitting.
          </p>
        </div>

        <button
          onClick={handleRecordQuantity}
          disabled={quantityLoading || !actualKg || Number(actualKg) <= 0}
          className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-5 rounded-2xl text-xl flex items-center justify-center gap-2"
        >
          {quantityLoading ? (
            <>
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Recording...
            </>
          ) : `✅ Confirm ${actualKg ? actualKg + ' kg' : 'Quantity'}`}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-700 to-blue-600 px-5 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full transform translate-x-10 -translate-y-10" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center">
              <span className="text-blue-700 text-sm font-black">IG</span>
            </div>
            <div>
              <p className="text-blue-200 text-xs">🌿 Harvest Agent</p>
              <h1 className="text-white text-xl font-black">{agent?.fullName?.split(' ')[0]}</h1>
              <p className="text-blue-200 text-xs">{agent?.agentCode}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/agent/profile')}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-lg">👤</span>
            </button>
            <button onClick={() => { logout(); navigate('/login') }}
              className="w-10 h-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
              <span className="text-lg">🚪</span>
            </button>
          </div>
        </div>

        {/* Switch to farmer */}
        {roles.includes('farmer') && (
          <button onClick={() => { setActiveRole('farmer'); navigate('/farmer') }}
            className="bg-green-500 bg-opacity-80 text-white text-xs px-3 py-1.5 rounded-full font-bold mb-4">
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
          ].map(stat => (
            <div key={stat.label} className="bg-white bg-opacity-15 rounded-xl p-2.5 text-center">
              <p className="text-xl font-black text-white">{stat.value}</p>
              <p className={`text-xs ${stat.color}`}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-4">

        {/* Success/Error messages */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
            ✅ {successMsg}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {error}
            <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
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
                <p className="text-gray-500 text-sm mt-1">You're all caught up 🎉</p>
              </div>
            ) : (
              active.map((h: any) => (
                <div key={h.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">

                  {/* Card header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-b border-blue-100">
                    <span className="font-black text-blue-700">{h.harvestNumber}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${statusColors[h.status] || 'bg-gray-100 text-gray-700'}`}>
                      {h.status?.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-4">
                    {/* Farmer info */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-black text-sm">
                          {h.member?.fullName?.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{h.member?.fullName}</p>
                        <p className="text-gray-500 text-xs">{h.member?.memberNumber} · {h.member?.village}</p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span>📅</span>
                        <span className="text-gray-700">
                          {new Date(h.harvestDate).toLocaleDateString('en-KE', {
                            weekday: 'long', day: 'numeric', month: 'long'
                          })}
                        </span>
                      </div>
                      {h.farmLocation && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>📍</span><span className="text-gray-700">{h.farmLocation}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span>📞</span>
                        <a href={`tel:${h.member?.phoneNumber}`} className="text-blue-600 font-medium">
                          {h.member?.phoneNumber}
                        </a>
                      </div>
                      {h.estimatedWeightKg && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>📊</span>
                          <span className="text-gray-700">
                            Farmer estimates: <span className="font-bold text-blue-600">{h.estimatedWeightKg} kg</span>
                          </span>
                        </div>
                      )}
                      {h.notes && (
                        <div className="flex items-start gap-2 text-sm">
                          <span>📝</span><span className="text-gray-600 text-xs">{h.notes}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mb-3 italic">{statusDesc[h.status]}</p>

                    {/* Action buttons based on status */}
                    <div className="space-y-2">
                      {h.status === 'confirmed' && (
                        <button
                          onClick={() => handleStartHarvest(h.id)}
                          disabled={actionLoading === h.id}
                          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                        >
                          {actionLoading === h.id ? (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                          ) : '🌿'} Start Harvesting
                        </button>
                      )}

                      {h.status === 'harvesting' && (
                        <button
                          onClick={() => { setSelectedHarvest(h); setShowQuantityModal(true); setError('') }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-sm"
                        >
                          ⚖️ Record Actual Quantity
                        </button>
                      )}

                      {h.status === 'picked_up' && (
                        <>
                          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
                            <p className="text-xs font-bold text-green-800">✅ Harvest Recorded</p>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-gray-600">
                                Est: {h.estimatedWeightKg || '—'} kg
                              </span>
                              <span className="text-xs font-bold text-green-700">
                                Actual: {h.actualWeightKg} kg
                                {h.weightVarianceKg !== null && h.weightVarianceKg !== undefined && (
                                  <span className={`ml-1 ${Number(h.weightVarianceKg) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    ({Number(h.weightVarianceKg) >= 0 ? '+' : ''}{Number(h.weightVarianceKg).toFixed(1)} kg)
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
                            {actionLoading === h.id ? (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                            ) : '🏭'} Deliver to SACCO
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
                      <a href={`https://wa.me/254${h.member?.phoneNumber?.slice(-9)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl font-bold text-sm">
                        💬 WhatsApp Farmer
                      </a>
                    </div>
                  </div>
                </div>
              ))
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
                const totalVal = h.items?.reduce((s: number, i: any) => s + Number(i.totalValue), 0) || 0
                return (
                  <div key={h.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold text-gray-900">{h.harvestNumber}</p>
                        <p className="text-gray-500 text-xs">{h.member?.fullName} · {h.member?.village}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(h.harvestDate).toLocaleDateString('en-KE')}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${statusColors[h.status] || 'bg-gray-100 text-gray-600'}`}>
                        {h.status?.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Weight summary */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-gray-400">Estimated</p>
                          <p className="font-bold text-blue-600">
                            {h.estimatedWeightKg ? `${h.estimatedWeightKg} kg` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Actual</p>
                          <p className="font-bold text-gray-900">
                            {h.actualWeightKg ? `${h.actualWeightKg} kg` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Variance</p>
                          <p className={`font-bold ${
                            h.weightVarianceKg >= 0 ? 'text-green-600' : 'text-red-500'
                          }`}>
                            {h.weightVarianceKg !== null && h.weightVarianceKg !== undefined
                              ? `${Number(h.weightVarianceKg) >= 0 ? '+' : ''}${Number(h.weightVarianceKg).toFixed(1)} kg`
                              : '—'
                            }
                          </p>
                        </div>
                      </div>
                      {totalVal > 0 && (
                        <div className="border-t border-gray-200 mt-2 pt-2 text-center">
                          <p className="text-xs text-gray-500">Farmer Payment</p>
                          <p className="font-black text-green-600">KES {totalVal.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex justify-around">
          <AgentNavBtn emoji="🌿" label="Active" active={activeTab === 'active'} onClick={() => setActiveTab('active')} />
          <AgentNavBtn emoji="✅" label="Completed" active={activeTab === 'completed'} onClick={() => setActiveTab('completed')} />
          <AgentNavBtn emoji="👤" label="Profile" active={false} onClick={() => navigate('/agent/profile')} />
        </div>
      </div>
    </div>
  )
}