import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function NewHarvestMobilePage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<any>(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    harvestDate: '',
    farmLocation: '',
    estimatedWeightKg: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member?.id) {
      setError('Session expired. Please login again.')
      navigate('/login')
      return
    }
    setLoading(true)
    setError('')
    try {
      console.log('Scheduling harvest for member:', member.id)
      const response = await api.post('/api/harvests', {
        memberId: member.id,
        harvestDate: form.harvestDate,
        farmLocation: form.farmLocation || undefined,
        estimatedWeightKg: form.estimatedWeightKg
          ? Number(form.estimatedWeightKg) : undefined,
        notes: form.notes || undefined
      })
      setSuccess(response.data.data)
    } catch (err: any) {
      console.error('Harvest error:', err.response?.data)
      setError(err.response?.data?.error || 'Failed to schedule pickup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl mb-6">✅</div>
      <h1 className="text-3xl font-black text-white mb-3">Pickup Scheduled!</h1>
      <div className="bg-white bg-opacity-20 rounded-2xl p-5 mb-6 w-full max-w-xs">
        <p className="text-white font-bold text-lg">{success.harvestNumber}</p>
        <p className="text-green-100 text-sm mt-1">
          📅 {new Date(success.harvestDate).toLocaleDateString('en-KE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
        {success.farmLocation && (
          <p className="text-green-100 text-sm mt-1">📍 {success.farmLocation}</p>
        )}
      </div>
      <p className="text-green-100 mb-8 text-sm">
        📱 You will receive an SMS when a driver is assigned to your pickup.
      </p>
      <div className="space-y-3 w-full max-w-xs">
        <button onClick={() => navigate('/farmer')}
          className="w-full bg-white text-green-700 font-black py-4 rounded-2xl text-lg">
          Back to Dashboard
        </button>
        <button onClick={() => {
          setSuccess(null)
          setForm({ harvestDate: '', farmLocation: '', estimatedWeightKg: '', notes: '' })
        }}
          className="w-full bg-green-700 bg-opacity-50 text-white font-bold py-4 rounded-2xl">
          Schedule Another
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 px-6 pt-12 pb-6">
        <button onClick={() => navigate('/farmer')}
          className="text-green-200 mb-4 flex items-center gap-2 text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-black text-white">Schedule Pickup 🌿</h1>
        <p className="text-green-200 text-sm mt-1">
          We'll send a driver to collect your miraa
        </p>
      </div>

      <div className="px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2">
            <span>⚠️</span><span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📅 Harvest Date *
              </label>
              <input
                type="date"
                value={form.harvestDate}
                onChange={e => setForm({ ...form, harvestDate: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-green-500 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📍 Farm Location
              </label>
              <input
                value={form.farmLocation}
                onChange={e => setForm({ ...form, farmLocation: e.target.value })}
                placeholder="e.g. Mutuati, near the river"
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                ⚖️ Estimated Weight (kg)
              </label>
              <input
                type="number"
                value={form.estimatedWeightKg}
                onChange={e => setForm({ ...form, estimatedWeightKg: e.target.value })}
                placeholder="e.g. 50"
                inputMode="numeric"
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-green-500 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📝 Special Instructions
              </label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Any special instructions for the driver..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50"
              />
            </div>
          </div>

          {/* Member confirmation */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-bold text-green-800 mb-2">📋 Your Details</p>
            <div className="space-y-1 text-sm text-green-700">
              <p>Name: <span className="font-bold">{member?.fullName}</span></p>
              <p>Member No: <span className="font-bold">{member?.memberNumber}</span></p>
              <p>Phone: <span className="font-bold">{member?.phoneNumber}</span></p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !form.harvestDate}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-black py-5 rounded-2xl text-xl shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Scheduling...
              </span>
            ) : '📅 Schedule Pickup'}
          </button>
        </form>
      </div>
    </div>
  )
}