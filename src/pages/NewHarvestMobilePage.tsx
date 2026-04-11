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
    if (!member?.id) { navigate('/login'); return }
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/api/harvests', {
        memberId: member.id,
        harvestDate: form.harvestDate,
        farmLocation: form.farmLocation || undefined,
        estimatedWeightKg: form.estimatedWeightKg ? Number(form.estimatedWeightKg) : undefined,
        notes: form.notes || undefined
      })
      setSuccess(response.data.data)
    } catch (err: any) {
      console.error('Harvest error:', err.response?.data)
      setError(err.response?.data?.error || 'Failed to schedule. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-7xl mb-6">✅</div>
      <h1 className="text-3xl font-black text-white mb-3">Harvest Scheduled!</h1>
      <div className="bg-white bg-opacity-20 rounded-2xl p-5 mb-6 w-full max-w-xs">
        <p className="text-white font-black text-lg">{success.harvestNumber}</p>
        <p className="text-green-100 text-sm mt-1">
          📅 {new Date(success.harvestDate).toLocaleDateString('en-KE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
        {success.farmLocation && (
          <p className="text-green-100 text-sm mt-1">📍 {success.farmLocation}</p>
        )}
        {success.estimatedWeightKg && (
          <p className="text-green-100 text-sm mt-1">
            📊 Your estimate: {success.estimatedWeightKg} kg
          </p>
        )}
      </div>
      <p className="text-green-100 mb-2 text-sm max-w-xs">
        📱 You will receive an SMS when our agent is assigned to your harvest.
      </p>
      <p className="text-green-200 text-xs mb-8 max-w-xs">
        Our agent will oversee the entire harvesting process and record the actual quantity obtained.
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
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => navigate('/farmer')}
          className="text-green-200 text-sm mb-4 flex items-center gap-2">
          ← Back
        </button>
        <h1 className="text-2xl font-black text-white">Request Harvest 🌿</h1>
        <p className="text-green-200 text-sm mt-1">
          Our agent will be sent to oversee your harvest
        </p>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* How it works */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-800 mb-2">ℹ️ How It Works</p>
          <div className="space-y-1.5">
            {[
              'You schedule the harvest date and approximate location',
              'SACCO assigns an agent to your farm on the scheduled date',
              'Agent oversees the entire harvesting process',
              'Agent records the actual kg harvested (may differ from your estimate)',
              'Your payment is based on the actual quantity recorded by the agent',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-blue-700">
                <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

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
            <p className="text-xs text-gray-400 mt-1">
              Select the date you want the agent to come to your farm
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📍 Farm Location
            </label>
            <input
              value={form.farmLocation}
              onChange={e => setForm({ ...form, farmLocation: e.target.value })}
              placeholder="e.g. Mutuati, near the river bridge"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              Be as specific as possible so the agent can find your farm easily
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📊 Approximate Weight (kg)
              <span className="text-green-600 text-xs ml-1 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={form.estimatedWeightKg}
              onChange={e => setForm({ ...form, estimatedWeightKg: e.target.value })}
              placeholder="e.g. 50"
              inputMode="numeric"
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-green-500 bg-gray-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              Your estimate helps us plan. The agent will record the actual amount.
              Over time, your estimates will become more accurate.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📝 Special Instructions
            </label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Any special instructions for the agent — e.g. which section of the farm to harvest first, gate is on the left side, etc..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
            />
          </div>
        </div>

        {/* Your details confirmation */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-bold text-green-800 mb-2">📋 Your Details</p>
          <div className="space-y-1 text-sm text-green-700">
            <p>Name: <span className="font-bold">{member?.fullName}</span></p>
            <p>Member No: <span className="font-bold">{member?.memberNumber}</span></p>
            <p>Phone: <span className="font-bold">{member?.phoneNumber}</span></p>
            {member?.village && (
              <p>Village: <span className="font-bold">{member.village}</span></p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            ⚠️ {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !form.harvestDate}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-black py-5 rounded-2xl text-xl shadow-lg flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Scheduling...
            </>
          ) : '📅 Request Harvest Agent'}
        </button>
      </div>
    </div>
  )
}