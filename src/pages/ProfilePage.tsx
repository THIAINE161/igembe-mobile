import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { member, driver, roles, logout } = useMobileStore()
  const [showChangePin, setShowChangePin] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin !== confirmPin) {
      setError('New PINs do not match')
      return
    }
    if (newPin.length !== 4) {
      setError('PIN must be 4 digits')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/api/mobile/change-pin', {
        phoneNumber: member?.phoneNumber || driver?.phoneNumber,
        currentPin,
        newPin
      })
      setSuccess('PIN changed successfully!')
      setShowChangePin(false)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change PIN')
    } finally {
      setLoading(false)
    }
  }

  const activeProfile = member || driver

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-green-700 px-6 pt-12 pb-20">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)}
            className="text-green-200 text-sm">← Back</button>
          <h1 className="text-white font-black text-lg">My Profile</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="px-4 -mt-12 space-y-4">

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-green-700 text-3xl font-black">
                {activeProfile?.fullName?.charAt(0)}
              </span>
            </div>
            <h2 className="text-white font-black text-xl">{activeProfile?.fullName}</h2>
            <div className="flex justify-center gap-2 mt-2">
              {roles.map(role => (
                <span key={role}
                  className="bg-white bg-opacity-20 text-white text-xs px-3 py-1 rounded-full capitalize font-medium">
                  {role === 'farmer' ? '🌿 Farmer' : '🚗 Driver'}
                </span>
              ))}
            </div>
          </div>

          <div className="p-5 space-y-3">
            {member && (
              <>
                <InfoRow label="Member Number" value={member.memberNumber} />
                <InfoRow label="Phone Number" value={member.phoneNumber} />
                <InfoRow label="Village" value={member.village || '—'} />
                <InfoRow label="Status" value={member.status} />
              </>
            )}
            {driver && !member && (
              <>
                <InfoRow label="Phone Number" value={driver.phoneNumber} />
                <InfoRow label="Vehicle" value={driver.vehicleReg || '—'} />
                <InfoRow label="Vehicle Type" value={driver.vehicleType || '—'} />
              </>
            )}
          </div>
        </div>

        {/* Success message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm font-medium">
            ✅ {success}
          </div>
        )}

        {/* Security */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-black text-gray-900 mb-4">🔐 Security</h3>

          {!showChangePin ? (
            <button
              onClick={() => setShowChangePin(true)}
              className="w-full border-2 border-green-200 text-green-700 font-bold py-3 rounded-xl hover:bg-green-50"
            >
              Change PIN
            </button>
          ) : (
            <form onSubmit={handleChangePin} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  ⚠️ {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Current PIN</label>
                <input
                  type="password"
                  value={currentPin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    if (val.length <= 4) setCurrentPin(val)
                  }}
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-2xl tracking-widest text-center focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">New PIN</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    if (val.length <= 4) setNewPin(val)
                  }}
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-2xl tracking-widest text-center focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '')
                    if (val.length <= 4) setConfirmPin(val)
                  }}
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                  className={`w-full px-4 py-3 border-2 rounded-xl text-2xl tracking-widest text-center focus:outline-none ${
                    confirmPin.length === 4
                      ? newPin === confirmPin ? 'border-green-500' : 'border-red-400'
                      : 'border-gray-200 focus:border-green-500'
                  }`}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePin(false)
                    setCurrentPin('')
                    setNewPin('')
                    setConfirmPin('')
                    setError('')
                  }}
                  className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || currentPin.length !== 4 || newPin.length !== 4 || newPin !== confirmPin}
                  className="flex-1 bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-xl"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Help */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <h3 className="font-black text-blue-900 mb-3">📞 Need Help?</h3>
          <p className="text-blue-700 text-sm mb-3">
            Contact Igembe SACCO office for any issues with your account.
          </p>
          <a href="tel:+254757630995"
            className="flex items-center gap-3 bg-white rounded-xl p-3 border border-blue-200">
            <span className="text-2xl">📞</span>
            <div>
              <p className="font-bold text-blue-900 text-sm">Call SACCO Office</p>
              <p className="text-blue-600 text-xs">+254 757 630 995</p>
            </div>
          </a>
          <a href="https://wa.me/254757630995"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white rounded-xl p-3 border border-blue-200 mt-2">
            <span className="text-2xl">💬</span>
            <div>
              <p className="font-bold text-blue-900 text-sm">WhatsApp Us</p>
              <p className="text-blue-600 text-xs">Chat with SACCO staff</p>
            </div>
          </a>
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-full bg-red-50 border-2 border-red-200 text-red-600 font-black py-4 rounded-2xl text-lg"
        >
          🚪 Logout
        </button>

        <p className="text-center text-xs text-gray-400 pb-4">
          Igembe Miraa Farmers SACCO © 2026
        </p>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-bold text-gray-900 text-sm capitalize">{value}</span>
    </div>
  )
}