import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { member, agent, driver, roles, logout, updateMember } = useMobileStore()
  const [showChangePin, setShowChangePin] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinLoading, setPinLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    member?.profilePhotoUrl || null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isFromFarmer = roles.includes('farmer')
  const activeProfile = member || agent || driver

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size
    if (file.size > 3 * 1024 * 1024) {
      setError('Photo must be less than 3MB. Please choose a smaller photo.')
      return
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, etc.)')
      return
    }

    setPhotoLoading(true)
    setError('')

    const reader = new FileReader()

    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      if (!base64) {
        setError('Failed to read image file')
        setPhotoLoading(false)
        return
      }

      // Show preview immediately
      setPhotoPreview(base64)

      // Try to compress if too large
      let imageToUpload = base64
      if (base64.length > 500000) {
        try {
          imageToUpload = await compressImage(base64)
        } catch (e) {
          console.log('Compression failed, using original')
        }
      }

      // Upload to backend
      try {
        if (!member?.id) throw new Error('Member ID not found')

        const response = await api.post(`/api/members/${member.id}/photo`, {
          photo: imageToUpload
        })

        const photoUrl = response.data.photoUrl || imageToUpload
        setPhotoPreview(photoUrl)

        if (updateMember) {
          updateMember({ ...member, profilePhotoUrl: photoUrl })
        }

        setSuccess('Profile photo updated! ✅')
        setTimeout(() => setSuccess(''), 4000)
      } catch (err: any) {
        console.error('Photo upload error:', err.response?.data || err.message)

        // If Cloudinary fails, save base64 directly via PATCH
        try {
          await api.patch(`/api/members/${member!.id}`, {
            profilePhotoUrl: imageToUpload.substring(0, 800000)
          })
          if (updateMember) {
            updateMember({ ...member, profilePhotoUrl: imageToUpload })
          }
          setSuccess('Photo saved! ✅')
          setTimeout(() => setSuccess(''), 4000)
        } catch (err2: any) {
          setError('Failed to save photo. Please try a smaller image (under 1MB).')
          setPhotoPreview(member?.profilePhotoUrl || null)
        }
      } finally {
        setPhotoLoading(false)
      }
    }

    reader.onerror = () => {
      setError('Failed to read the image file')
      setPhotoLoading(false)
    }

    reader.readAsDataURL(file)
  }

  // Image compression helper
  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 600
        let width = img.width
        let height = img.height

        if (width > height && width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width
          width = MAX_SIZE
        } else if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height
          height = MAX_SIZE
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas failed')); return }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = () => reject(new Error('Image load failed'))
      img.src = base64
    })
  }

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin !== confirmPin) { setError('PINs do not match'); return }
    if (newPin.length !== 4) { setError('PIN must be 4 digits'); return }
    setPinLoading(true)
    setError('')
    try {
      await api.post('/api/mobile/change-pin', {
        phoneNumber: member?.phoneNumber || agent?.phoneNumber || driver?.phoneNumber,
        currentPin,
        newPin
      })
      setSuccess('PIN changed successfully! ✅')
      setShowChangePin(false)
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change PIN')
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full transform translate-x-10 -translate-y-10" />
        <button
          onClick={() => navigate(isFromFarmer ? '/farmer' : '/agent')}
          className="text-green-200 text-sm flex items-center gap-2 mb-6"
        >
          ← Back
        </button>
        <h1 className="text-white text-2xl font-black">My Profile</h1>
        <p className="text-green-200 text-sm mt-1">Manage your account details</p>
      </div>

      <div className="px-4 -mt-12 space-y-4">

        {/* Profile Photo Card */}
        <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-green-500 p-6 text-center">

            {/* Photo */}
            <div className="relative inline-block mb-4">
              <div
                className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-xl mx-auto flex items-center justify-center"
                style={{ backgroundColor: '#dcfce7' }}
              >
                {photoLoading ? (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <span className="text-green-600 text-xs mt-1">Uploading...</span>
                  </div>
                ) : photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setPhotoPreview(null)}
                  />
                ) : (
                  <span className="text-green-700 text-5xl font-black">
                    {activeProfile?.fullName?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Camera button */}
              <button
                onClick={() => { setError(''); fileInputRef.current?.click() }}
                disabled={photoLoading}
                className="absolute -bottom-1 -right-1 w-9 h-9 bg-white border-2 border-green-500 rounded-full flex items-center justify-center shadow-lg active:bg-gray-50"
              >
                <span className="text-base">📷</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            <h2 className="text-white font-black text-xl">{activeProfile?.fullName}</h2>
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              {roles.map(role => (
                <span key={role}
                  className="text-white text-xs px-3 py-1 rounded-full font-medium capitalize"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  {role === 'farmer' ? '🌿 Farmer' : '🧑‍🌾 Agent'}
                </span>
              ))}
            </div>
            <p className="text-green-100 text-xs mt-2">
              Tap 📷 to update your profile photo
            </p>
          </div>

          {/* Info Rows */}
          <div className="p-5 space-y-3">
            {member && (
              <>
                <InfoRow icon="🔢" label="Member Number" value={member.memberNumber || '—'} />
                <InfoRow icon="📱" label="Phone Number" value={member.phoneNumber || '—'} />
                <InfoRow icon="🏘️" label="Village" value={member.village || '—'} />
                <InfoRow icon="📋" label="Status" value={member.status || '—'} />
              </>
            )}
            {(agent || driver) && !member && (
              <>
                <InfoRow icon="🔢" label="Agent Code" value={(agent || driver)?.agentCode || '—'} />
                <InfoRow icon="📱" label="Phone" value={(agent || driver)?.phoneNumber || '—'} />
                <InfoRow icon="🚗" label="Vehicle" value={(agent || driver)?.vehicleReg || '—'} />
                <InfoRow icon="🚙" label="Type" value={(agent || driver)?.vehicleType || '—'} />
              </>
            )}
          </div>
        </div>

        {/* Success / Error Messages */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
            {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-start gap-2">
            <span className="flex-shrink-0">⚠️</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} className="font-bold text-red-400 flex-shrink-0">×</button>
          </div>
        )}

        {/* Photo Upload Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-800 mb-1">📷 Photo Upload Tips</p>
          <ul className="text-xs text-blue-700 space-y-0.5">
            <li>• Use a clear, well-lit photo of your face</li>
            <li>• Keep file size under 3MB (smaller = faster upload)</li>
            <li>• JPG or PNG format works best</li>
          </ul>
        </div>

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
              {[
                { label: 'Current PIN', value: currentPin, setter: setCurrentPin },
                { label: 'New PIN', value: newPin, setter: setNewPin },
                { label: 'Confirm New PIN', value: confirmPin, setter: setConfirmPin },
              ].map((field, i) => (
                <div key={i}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{field.label}</label>
                  <input
                    type="password"
                    value={field.value}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '')
                      if (val.length <= 4) field.setter(val)
                    }}
                    placeholder="••••"
                    maxLength={4}
                    inputMode="numeric"
                    className={`w-full px-4 py-3 border-2 rounded-2xl text-2xl tracking-widest text-center focus:outline-none ${
                      i === 2 && confirmPin.length === 4
                        ? newPin === confirmPin ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'
                        : 'border-gray-200 focus:border-green-500'
                    }`}
                  />
                </div>
              ))}
              {confirmPin.length === 4 && (
                <p className={`text-xs text-center font-medium ${newPin === confirmPin ? 'text-green-600' : 'text-red-500'}`}>
                  {newPin === confirmPin ? '✅ PINs match!' : '❌ PINs do not match'}
                </p>
              )}
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => { setShowChangePin(false); setCurrentPin(''); setNewPin(''); setConfirmPin(''); setError('') }}
                  className="flex-1 border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-2xl">
                  Cancel
                </button>
                <button type="submit"
                  disabled={pinLoading || currentPin.length !== 4 || newPin.length !== 4 || newPin !== confirmPin}
                  className="flex-1 bg-green-600 disabled:bg-green-300 text-white font-bold py-3 rounded-2xl">
                  {pinLoading ? 'Saving...' : 'Save PIN'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Help & Contact */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="font-black text-gray-900 mb-4">📞 Help & Support</p>
          <div className="space-y-3">
            <a href="tel:+254757630995"
              className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white">📞</span>
              </div>
              <div>
                <p className="font-bold text-green-900 text-sm">Call SACCO Office</p>
                <p className="text-green-600 text-xs">+254 757 630 995</p>
              </div>
            </a>
            <a href="https://wa.me/254757630995"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-4 bg-green-50 border border-green-200 rounded-2xl p-4">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
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
          <p className="text-xs text-gray-500 font-medium">Igembe Miraa Farmers SACCO</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Powered by <span className="font-medium">Igembe Tech Solutions Ltd</span>
          </p>
          <p className="text-xs text-gray-300 mt-1">Version 1.0.0 © 2026</p>
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
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-gray-500 text-sm">{label}</span>
      </div>
      <span className="font-bold text-gray-900 text-sm capitalize">{value}</span>
    </div>
  )
}