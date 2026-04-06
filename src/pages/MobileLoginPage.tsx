import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function MobileLoginPage() {
  const navigate = useNavigate()
  const { login } = useMobileStore()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) {
      setError('PIN must be exactly 4 digits')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/api/mobile/login', {
        phoneNumber: phone,
        pin
      })
      const { token, roles, member, driver, isFirstLogin: first } = response.data

      if (first) setIsFirstLogin(true)

      login(token, member, driver, roles)

      if (roles.length > 1) {
        navigate('/select-role')
      } else if (roles[0] === 'farmer') {
        navigate('/farmer')
      } else {
        navigate('/driver')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Check your phone number.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-green-700">

      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
          <span className="text-green-700 text-4xl font-black">IG</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-1">Igembe SACCO</h1>
        <p className="text-green-200 text-center">Farmer & Driver Portal</p>
        <p className="text-green-300 text-sm text-center mt-1">
          🌿 Igembe South, Meru County
        </p>

        {isFirstLogin && (
          <div className="mt-4 bg-green-600 border border-green-400 rounded-2xl px-4 py-3 text-center">
            <p className="text-white text-sm font-semibold">🎉 Welcome! Your PIN has been set.</p>
            <p className="text-green-200 text-xs mt-1">Use this PIN every time you login</p>
          </div>
        )}
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-2xl font-black text-gray-900 mb-1">Sign In</h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your phone number and 4-digit PIN
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔐 4-Digit PIN
              {phone && (
                <span className="text-green-600 text-xs ml-2 font-normal">
                  (First time? Any 4 digits will set your PIN)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '')
                  if (val.length <= 4) setPin(val)
                }}
                placeholder="••••"
                maxLength={4}
                required
                inputMode="numeric"
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl tracking-widest text-center focus:outline-none focus:border-green-500 bg-gray-50 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPin ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full ${
                  pin.length > i ? 'bg-green-600' : 'bg-gray-200'
                }`} />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold py-5 rounded-2xl text-xl transition-all shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In →'}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => navigate('/forgot-pin')}
            className="w-full text-green-600 text-sm font-semibold py-2 border border-green-200 rounded-xl hover:bg-green-50"
          >
            🔐 Forgot PIN?
          </button>
          <p className="text-center text-xs text-gray-400">
            Not registered? Visit Igembe SACCO office or{' '}
            <a href="https://igembe-dashboard.netlify.app/register"
              className="text-green-600 font-semibold">
              register online
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}