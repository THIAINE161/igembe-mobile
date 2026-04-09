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

    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setPhotoPreview(base64)

      try {
        const response = await api.post(`/api/members/${member?.id}/photo`, {
          photo: base64
        })
        const { photoUrl } = response.data
        setPhotoPreview(photoUrl)
        if (updateMember) {
          updateMember({ ...member, profilePhotoUrl: photoUrl })
        }
        setSuccess('Profile photo updated successfully!')
        setTimeout(() => setSuccess(''), 3000)
      } catch (err: any) {
        console.error('Photo error:', err.response?.data)
        setError('Failed to upload photo. Check internet connection.')
        setPhotoPreview(member?.profilePhotoUrl || null)
      } finally {
        setPhotoLoading(false)
      }
    }
    reader.readAsDataURL(file)
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

        {/* rest of file unchanged... */}
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