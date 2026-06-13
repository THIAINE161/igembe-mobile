import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

function Spinner() {
  return (
    <svg className="animate-spin h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function HarvestEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { member } = useMobileStore()

  const [harvest, setHarvest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({
    farmLocation: '',
    harvestDate: '',
    estimatedWeightKg: '',
    notes: ''
  })

  useEffect(() => {
    if (!member) { navigate('/login', { replace: true }); return }
    if (!id) { navigate('/farmer', { replace: true }); return }
    fetchHarvest()
  }, [id])

  const fetchHarvest = async () => {
    setLoading(true)
    setError('')
    try {
      const r = await api.get(`/api/harvests/${id}`)
      const h = r.data?.data
      if (!h) { setError('Harvest not found'); return }
      setHarvest(h)

      // Pre-fill form with existing values
      setForm({
        farmLocation: h.farmLocation || '',
        harvestDate: h.harvestDate
          ? new Date(h.harvestDate).toISOString().split('T')[0]
          : '',
        estimatedWeightKg: h.estimatedWeightKg ? String(h.estimatedWeightKg) : '',
        notes: h.notes || ''
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load harvest')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!harvest) return
    setSaving(true)
    setError('')
    try {
      await api.patch(`/api/harvests/${id}`, {
        farmLocation: form.farmLocation.trim() || null,
        harvestDate: form.harvestDate || undefined,
        estimatedWeightKg: form.estimatedWeightKg ? Number(form.estimatedWeightKg) : undefined,
        notes: form.notes.trim() || null,
        editedBy: member?.fullName || 'Farmer'
      })
      setSuccess(true)
      setTimeout(() => navigate(-1), 1500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes. Try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
      <Spinner />
      <p className="text-gray-500 text-sm">Loading harvest...</p>
    </div>
  )

  // ── Fetch error ──────────────────────────────────────────────────────────────
  if (error && !harvest) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <p className="text-5xl mb-4">⚠️</p>
      <p className="font-bold text-gray-900 mb-2">Failed to load harvest</p>
      <p className="text-gray-500 text-sm mb-6 text-center">{error}</p>
      <div className="flex gap-3">
        <button onClick={() => navigate(-1)} className="border-2 border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-bold">
          ← Back
        </button>
        <button onClick={fetchHarvest} className="bg-green-600 text-white px-5 py-3 rounded-2xl font-bold">
          Try Again
        </button>
      </div>
    </div>
  )

  const canEdit = harvest && ['scheduled', 'confirmed'].includes(harvest.status)

  // ── Success ──────────────────────────────────────────────────────────────────
  if (success) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <span className="text-5xl">✅</span>
      </div>
      <h2 className="text-xl font-black text-gray-900 mb-2">Harvest Updated!</h2>
      <p className="text-gray-500 text-sm">Your changes have been saved.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-green-200 text-sm mb-4 block">
          ← Cancel
        </button>
        <h1 className="text-white text-xl font-black">✏️ Edit Harvest</h1>
        <p className="text-green-200 text-sm">
          {harvest?.harvestNumber} · {(harvest?.status || '').replace(/_/g, ' ')}
        </p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="font-bold">×</button>
          </div>
        )}

        {/* Can't edit */}
        {!canEdit ? (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
            <p className="text-4xl mb-3">🔒</p>
            <p className="font-bold text-orange-800">Cannot Edit</p>
            <p className="text-orange-600 text-sm mt-1">
              Harvest is currently <strong>{harvest?.status?.replace(/_/g, ' ')}</strong>.
              Only <strong>scheduled</strong> or <strong>confirmed</strong> harvests can be edited.
            </p>
            <p className="text-orange-500 text-xs mt-2">
              Contact the SACCO office if you need changes at this stage.
            </p>
            <button onClick={() => navigate(-1)} className="mt-4 bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm">
              Go Back
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <p className="text-xs text-gray-500 font-medium">
              Edit the details below. Changes will be saved immediately.
            </p>

            {/* Farm Location */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📍 Farm Location
              </label>
              <input
                type="text"
                value={form.farmLocation}
                onChange={e => setForm(f => ({ ...f, farmLocation: e.target.value }))}
                placeholder="e.g. Mutuati, Laare, Maua"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
              />
            </div>

            {/* Harvest Date */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📅 Harvest Date
              </label>
              <input
                type="date"
                value={form.harvestDate}
                onChange={e => setForm(f => ({ ...f, harvestDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
              />
            </div>

            {/* Estimated Weight */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ⚖️ Estimated Weight (kg)
              </label>
              <input
                type="number"
                value={form.estimatedWeightKg}
                onChange={e => setForm(f => ({ ...f, estimatedWeightKg: e.target.value }))}
                placeholder="e.g. 50"
                min="1"
                step="0.5"
                inputMode="decimal"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📝 Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any notes for the SACCO or agent..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm resize-none"
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
            >
              {saving ? <><Spinner /> Saving...</> : '💾 Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}