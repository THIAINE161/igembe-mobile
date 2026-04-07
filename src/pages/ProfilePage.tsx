import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { member, driver, roles, logout, updateMember } = useMobileStore()
  const [showChangePin, setShowChangePin] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    member?.profilePhotoUrl || null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeProfile = member || driver
  const isFromFarmer = roles.includes('farmer')

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be less than 5MB')
      return
    }

    setPhotoLoading(true)
    setError('')

    try {
      // Convert to base64 for preview
      const reader = new FileReader()
      reader.onload = async (event) => {
        const base64 = event.target?.result as string
        setPhotoPreview(base64)

        // Upload to backend
        try {
          const response = await api.patch(`/api/members/${member?.id}`, {
            profilePhotoUrl: base64
          })
          if (updateMember) {
            updateMember({ ...member, profilePhotoUrl: base64 })
          }
          setSuccess('Profile photo updated!')
          setTimeout(() => setSuccess(''), 3000)
        } catch (err: any) {
          setError('Failed to save photo. Try again.')
          setPhotoPreview(member?.profilePhotoUrl || null)
        } finally {
          setPhotoLoading(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError('Failed to process photo')
      setPhotoLoading(false)
    }
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin !== confirmPin) { setError('PINs do not match'); return }
    if (newPin.length !== 4) { setError('PIN must be 4 digits'); return }
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

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full transform translate-x-10 -translate-y-10" />
        <button
          onClick={() => navigate(isFromFarmer ? '/farmer' : '/driver')}
          className="text-green-200 text-sm flex items-center gap-2 mb-6"
        >
          ← Back
        </button>
        <h1 className="text-white text-2xl font-black">My Profile</h1>
        <p className="text-green-200 text-sm mt-1">Manage your account details</p>
      </div>

      <div className="px-4 -mt-16 space-y-4">

        {/* Profile Photo Card */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-center">
            {/* Photo */}
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-xl bg-green-100 flex items-center justify-center mx-auto">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-green-700 text-4xl font-black">
                    {activeProfile?.fullName?.charAt(0)}
                  </span>
                )}
              </div>
              {/* Camera button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-600 border-2 border-white rounded-full flex items-center justify-center shadow-md"
              >
                {photoLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <span className="text-white text-xs">📷</span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            <h2 className="text-white font-black text-xl">{activeProfile?.fullName}</h2>
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              {roles.map(role => (
                <span key={role}
                  className="bg-white bg-opacity-20 text-white text-xs px-3 py-1 rounded-full font-medium capitalize">
                  {role === 'farmer' ? '🌿 Farmer' : '🚗 Driver'}
                </span>
              ))}
            </div>
            <p className="text-green-200 text-xs mt-2">
              Tap the camera icon to change your photo
            </p>
          </div>

          {/* Info */}
          <div className="p-5 space-y-3">
            {member && (
              <>
                <InfoRow icon="🔢" label="Member Number" value={member.memberNumber} />
                <InfoRow icon="📱" label="Phone Number" value={member.phoneNumber} />
                <InfoRow icon="🏘️" label="Village" value={member.village || '—'} />
                <InfoRow icon="📋" label="Status" value={member.status} />
              </>
            )}
            {driver && !member && (
              <>
                <InfoRow icon="📱" label="Phone Number" value={driver.phoneNumber} />
                <InfoRow icon="🚗" label="Vehicle" value={driver.vehicleReg || '—'} />
                <InfoRow icon="🚙" label="Vehicle Type" value={driver.vehicleType || '—'} />
              </>
            )}
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Security */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="font-black text-gray-900 mb-4">🔐 Security</p>

          {!showChangePin ? (
            <div className="space-y-3">
              <button
                onClick={() => { setShowChangePin(true); setError('') }}
                className="w-full border-2 border-green-200 text-green-700 font-bold py-3.5 rounded-2xl hover:bg-green-50 flex items-center justify-center gap-2"
              >
                🔑 Change PIN
              </button>
              <button
                onClick={() => navigate('/forgot-pin')}
                className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3.5 rounded-2xl hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                🔐 Forgot PIN? Reset it
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePin} className="space-y-4">
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-2xl tracking-widest text-center focus:outline-none focus:border-green-500"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-2xl tracking-widest text-center focus:outline-none focus:border-green-500"
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
                  className={`w-full px-4 py-3 border-2 rounded-2xl text-2xl tracking-widest text-center focus:outline-none ${
                    confirmPin.length === 4
                      ? newPin === confirmPin ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'
                      : 'border-gray-200'
                  }`}
                />
                {confirmPin.length === 4 && newPin === confirmPin && (
                  <p className="text-green-600 text-xs text-center mt-1">✅ PINs match!</p>
                )}
                {confirmPin.length === 4 && newPin !== confirmPin && (
                  <p className="text-red-500 text-xs text-center mt-1">❌ PINs don't match</p>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => { setShowChangePin(false); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setError('') }}
                  className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-2xl">
                  Cancel
                </button>
                <button type="submit"
                  disabled={loading || currentPin.length !== 4 || newPin.length !== 4 || newPin !== confirmPin}
                  className="flex-1 bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-2xl">
                  {loading ? 'Saving...' : 'Save PIN'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Contact & Help */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="font-black text-gray-900 mb-4">📞 Contact & Help</p>
          <div className="space-y-3">
            <a href="tel:+254757630995"
              className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                <span className="text-white">📞</span>
              </div>
              <div>
                <p className="font-bold text-green-900 text-sm">Call SACCO Office</p>
                <p className="text-green-600 text-xs">+254 757 630 995</p>
              </div>
            </a>
            <a href="https://wa.me/254757630995" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <span className="text-white">💬</span>
              </div>
              <div>
                <p className="font-bold text-green-900 text-sm">WhatsApp Us</p>
                <p className="text-green-600 text-xs">Chat with SACCO staff</p>
              </div>
            </a>
          </div>
        </div>

        {/* App Info */}
        <div className="bg-gray-100 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-500">Igembe Miraa Farmers SACCO</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Powered by Igembe Tech Solutions Ltd © 2026
          </p>
          <p className="text-xs text-gray-300 mt-1">Version 1.0.0</p>
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-full bg-red-50 border-2 border-red-200 text-red-600 font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <span className="text-gray-500 text-sm">{label}</span>
      </div>
      <span className="font-bold text-gray-900 text-sm capitalize">{value}</span>
    </div>
  )
}