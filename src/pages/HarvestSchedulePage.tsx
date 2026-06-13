import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function HarvestSchedulePage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()
  const [form, setForm] = useState({
    harvestDate: '',
    farmLocation: '',
    estimatedWeightKg: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)

  if (!member) { navigate('/login', { replace: true }); return null }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.harvestDate) { setError('Please select a harvest date'); return }
    setLoading(true)
    setError('')
    try {
      const r = await api.post('/api/harvests', {
        memberId: member.id,
        harvestDate: form.harvestDate,
        farmLocation: form.farmLocation.trim() || null,
        estimatedWeightKg: form.estimatedWeightKg ? Number(form.estimatedWeightKg) : undefined,
        notes: form.notes.trim() || null
      })
      setSuccess(r.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-5xl">✅</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Harvest Scheduled!</h2>
        <div className="bg-green-50 rounded-2xl p-4 mb-5 text-left">
          <p className="text-xs text-gray-500">Reference Number</p>
          <p className="font-black text-green-700 text-xl">{success.harvestNumber}</p>
          <p className="text-xs text-gray-500 mt-2">Date</p>
          <p className="font-bold text-gray-900">
            {new Date(success.harvestDate).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {form.farmLocation && (
            <>
              <p className="text-xs text-gray-500 mt-2">Location</p>
              <p className="font-bold text-gray-900">{form.farmLocation}</p>
            </>
          )}
        </div>
        <p className="text-gray-500 text-sm mb-5">An agent will be assigned soon. You will receive an SMS confirmation.</p>
        <button onClick={() => navigate('/farmer')} className="w-full bg-green-600 text-white font-black py-3 rounded-2xl">
          Back to Dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-green-200 text-sm mb-4 block">← Back</button>
        <h1 className="text-white text-xl font-black">🌿 Schedule Harvest Pickup</h1>
        <p className="text-green-200 text-sm mt-1">An agent will be assigned and contact you.</p>
      </div>
      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
            <span>⚠️ {error}</span><button onClick={() => setError('')} className="font-bold">×</button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📅 Harvest Date *</label>
            <input type="date" value={form.harvestDate} onChange={e => setForm(f => ({ ...f, harvestDate: e.target.value }))}
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📍 Farm Location</label>
            <input type="text" value={form.farmLocation} onChange={e => setForm(f => ({ ...f, farmLocation: e.target.value }))}
              placeholder="e.g. Mutuati, Laare, Maua"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">⚖️ Estimated Weight (kg)</label>
            <input type="number" value={form.estimatedWeightKg} onChange={e => setForm(f => ({ ...f, estimatedWeightKg: e.target.value }))}
              placeholder="e.g. 50" min="1" step="0.5" inputMode="decimal"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📝 Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any special notes..." rows={2}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
            {loading ? (
              <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Scheduling...</>
            ) : '✅ Schedule Pickup'}
          </button>
        </form>
      </div>
    </div>
  )
}