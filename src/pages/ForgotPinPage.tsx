import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.startsWith('254') && digits.length === 12) return '0' + digits.slice(3)
  if (digits.startsWith('0') && digits.length === 10) return digits
  if (digits.length === 9) return '0' + digits
  return raw
}

export default function ForgotPinPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'phone' | 'code' | 'success'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugCode, setDebugCode] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) { setError('Enter your phone number'); return }
    setLoading(true)
    setError('')
    try {
      const clean = normalizePhone(phone.trim())
      const r = await api.post('/api/mobile/forgot-pin', { phoneNumber: clean })
      if (r.data.debugCode) setDebugCode(r.data.debugCode) // dev only
      setStep('code')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed. Check your phone number.')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) { setError('Enter the reset code'); return }
    if (!/^\d{4}$/.test(newPin)) { setError('New PIN must be exactly 4 digits'); return }
    if (newPin !== confirmPin) { setError('PINs do not match'); return }
    setLoading(true)
    setError('')
    try {
      await api.post('/api/mobile/reset-pin', {
        phoneNumber: normalizePhone(phone.trim()),
        resetCode: code.trim(),
        newPin
      })
      setStep('success')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Reset failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-5xl">🎉</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">PIN Reset!</h2>
        <p className="text-gray-600 mb-6">Your PIN has been updated. You can now login with your new PIN.</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          className="w-full bg-green-600 text-white font-black py-3 rounded-2xl"
        >
          Go to Login
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-14 pb-8">
        <button onClick={() => navigate('/login')} className="text-green-200 text-sm mb-4 block">
          ← Back to Login
        </button>
        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4">
          <span className="text-2xl">🔑</span>
        </div>
        <h1 className="text-white text-2xl font-black">Forgot PIN?</h1>
        <p className="text-green-200 text-sm mt-1">
          {step === 'phone'
            ? 'Enter your phone number to receive a reset code.'
            : 'Enter the 6-digit code sent to your phone.'}
        </p>
      </div>

      <div className="flex-1 px-5 py-6 space-y-4 max-w-sm mx-auto w-full">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="font-bold">×</button>
          </div>
        )}

        {debugCode && (
          <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded-2xl text-sm">
            Dev mode — Reset code: <strong>{debugCode}</strong>
          </div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712 345 678"
                inputMode="numeric"
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-bold text-center focus:outline-none focus:border-green-500 bg-gray-50"
              />
              <p className="text-xs text-gray-400 text-center mt-2">
                Must match the number registered with SACCO
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Sending...</>
              ) : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <p className="text-sm text-gray-600 mb-4 text-center">
                Code sent to <strong>{phone}</strong>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Reset Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                    inputMode="numeric"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-2xl font-black text-center focus:outline-none focus:border-green-500 bg-gray-50 tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">New PIN (4 digits)</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    placeholder="••••"
                    maxLength={4}
                    inputMode="numeric"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-2xl font-black text-center focus:outline-none focus:border-green-500 bg-gray-50 tracking-widest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Confirm New PIN</label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={e => setConfirmPin(e.target.value)}
                    placeholder="••••"
                    maxLength={4}
                    inputMode="numeric"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-2xl font-black text-center focus:outline-none focus:border-green-500 bg-gray-50 tracking-widest"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Resetting...</>
              ) : 'Reset PIN'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('phone'); setCode(''); setError('') }}
              className="w-full text-gray-500 text-sm underline"
            >
              Resend code
            </button>
          </form>
        )}
      </div>
    </div>
  )
}