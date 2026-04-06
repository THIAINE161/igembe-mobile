import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

type Step = 'phone' | 'code' | 'newpin' | 'success'

export default function ForgotPinPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [phone, setPhone] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/api/mobile/forgot-pin', { phoneNumber: phone })
      setStep('code')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (resetCode.length !== 6) {
      setError('Please enter the 6-digit code')
      return
    }
    setStep('newpin')
    setError('')
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin.length !== 4) {
      setError('PIN must be exactly 4 digits')
      return
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/api/mobile/reset-pin', {
        phoneNumber: phone,
        resetCode,
        newPin
      })
      setStep('success')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-green-700">
      {/* Top */}
      <div className="flex items-center justify-between px-6 pt-12 pb-8">
        <button onClick={() => navigate('/login')}
          className="text-green-200 flex items-center gap-2 text-sm">
          ← Back to Login
        </button>
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <span className="text-green-700 font-black text-sm">IG</span>
        </div>
      </div>

      <div className="flex-1 flex items-end">
        <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 w-full shadow-2xl">

          {/* Success */}
          {step === 'success' && (
            <div className="text-center py-6">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">PIN Reset!</h2>
              <p className="text-gray-500 mb-6">
                Your PIN has been reset successfully. You can now login with your new PIN.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-lg"
              >
                Login Now →
              </button>
            </div>
          )}

          {/* Step 1 — Phone */}
          {step === 'phone' && (
            <>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Forgot PIN? 🔐</h2>
              <p className="text-gray-500 text-sm mb-6">
                Enter your phone number and we'll send you a reset code via SMS.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📱 Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0712345678"
                    required
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-green-500 bg-gray-50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !phone}
                  className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Sending...
                    </span>
                  ) : 'Send Reset Code 📱'}
                </button>
              </form>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs text-yellow-700">
                  ⚠️ <span className="font-bold">Note:</span> SMS delivery requires Africa's Talking production account.
                  If you don't receive an SMS, contact SACCO office directly at <span className="font-bold">0757630995</span>
                </p>
              </div>
            </>
          )}

          {/* Step 2 — Enter Code */}
          {step === 'code' && (
            <>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Enter Reset Code 📲</h2>
              <p className="text-gray-500 text-sm mb-2">
                We sent a 6-digit code to <span className="font-bold text-gray-700">{phone}</span>
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Code expires in 15 minutes
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    🔢 6-Digit Reset Code
                  </label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '')
                      if (val.length <= 6) setResetCode(val)
                    }}
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    required
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl tracking-widest text-center focus:outline-none focus:border-green-500 bg-gray-50"
                  />
                  <div className="flex justify-center gap-1 mt-2">
                    {[0,1,2,3,4,5].map(i => (
                      <div key={i} className={`w-3 h-3 rounded-full ${
                        resetCode.length > i ? 'bg-green-600' : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetCode.length !== 6}
                  className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg"
                >
                  Verify Code →
                </button>

                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="w-full text-gray-500 text-sm py-2"
                >
                  ← Change phone number
                </button>
              </form>
            </>
          )}

          {/* Step 3 — New PIN */}
          {step === 'newpin' && (
            <>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Set New PIN 🔐</h2>
              <p className="text-gray-500 text-sm mb-6">
                Choose a new 4-digit PIN that you'll remember.
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleResetPin} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    🔐 New 4-Digit PIN
                  </label>
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
                    required
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl tracking-widest text-center focus:outline-none focus:border-green-500 bg-gray-50"
                  />
                  <div className="flex justify-center gap-2 mt-2">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`w-3 h-3 rounded-full ${
                        newPin.length > i ? 'bg-green-600' : 'bg-gray-200'
                      }`} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    🔐 Confirm New PIN
                  </label>
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
                    required
                    className={`w-full px-4 py-4 border-2 rounded-xl text-3xl tracking-widest text-center focus:outline-none bg-gray-50 ${
                      confirmPin.length === 4
                        ? newPin === confirmPin
                          ? 'border-green-500'
                          : 'border-red-400'
                        : 'border-gray-200'
                    }`}
                  />
                  {confirmPin.length === 4 && newPin !== confirmPin && (
                    <p className="text-red-500 text-xs text-center mt-1">PINs do not match</p>
                  )}
                  {confirmPin.length === 4 && newPin === confirmPin && (
                    <p className="text-green-500 text-xs text-center mt-1">✅ PINs match!</p>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs text-blue-700">
                    💡 <span className="font-bold">Tip:</span> Use a PIN you'll easily remember but others won't guess. Avoid 1234, 0000, or your birth year.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || newPin.length !== 4 || newPin !== confirmPin}
                  className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Resetting...
                    </span>
                  ) : '✅ Reset PIN'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}