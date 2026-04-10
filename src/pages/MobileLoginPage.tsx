import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

const MIRAA_IMAGE = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Khat_Catha_edulis_Forsk.jpg/640px-Khat_Catha_edulis_Forsk.jpg'

export default function MobileLoginPage() {
  const navigate = useNavigate()
  const { login } = useMobileStore()
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) { setError('PIN must be exactly 4 digits'); return }
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/api/mobile/login', { phoneNumber: phone, pin })
      const { token, roles, member, driver } = response.data
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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-green-800">

      {/* Miraa Background Photo */}
      <img
        src={MIRAA_IMAGE}
        alt="Miraa plant"
        className="absolute inset-0 w-full h-full object-cover opacity-20"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(20,83,45,0.85) 0%, rgba(21,128,61,0.95) 60%, rgba(255,255,255,1) 100%)' }} />

      {/* Decorative leaves */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
          { emoji: '🌿', top: '5%', right: '5%', rot: '-15deg' },
          { emoji: '🍃', top: '15%', left: '3%', rot: '10deg' },
          { emoji: '🌱', top: '35%', right: '8%', rot: '-20deg' },
        ].map((item, i) => (
          <div key={i} className="absolute text-5xl opacity-20"
            style={{ top: item.top, left: item.left, right: item.right, transform: `rotate(${item.rot})` }}>
            {item.emoji}
          </div>
        ))}
      </div>

      {/* Top Section */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl border-4 border-green-300 border-opacity-50">
          <span className="text-green-700 text-4xl font-black">IG</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-1 text-center">Igembe SACCO</h1>
        <p className="text-green-200 text-center">Farmer & Driver Portal</p>
        <p className="text-green-300 text-sm text-center mt-1">🌿 Igembe South, Meru County</p>

        {/* Price teaser */}
        <div className="mt-6 bg-white bg-opacity-15 rounded-2xl px-5 py-3 text-center border border-white border-opacity-20">
          <p className="text-green-100 text-xs mb-1">Today's Miraa Prices</p>
          <p className="text-white text-sm font-bold">Login to see live prices 📊</p>
        </div>
      </div>

      {/* Login Card */}
      <div className="relative z-10 bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
        <h2 className="text-2xl font-black text-gray-900 mb-1">Sign In</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your phone number and 4-digit PIN</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📱 Phone Number</label>
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
              {!pin && <span className="text-green-600 text-xs ml-2 font-normal">(First time? Any 4 digits sets your PIN)</span>}
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
              <button type="button" onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                {showPin ? '🙈' : '👁️'}
              </button>
            </div>
            <div className="flex justify-center gap-2 mt-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full transition-all ${
                  pin.length > i ? 'bg-green-600 scale-110' : 'bg-gray-200'
                }`} />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-black py-5 rounded-2xl text-xl transition-all shadow-lg"
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

        <div className="mt-5 space-y-3">
          <button onClick={() => navigate('/forgot-pin')}
            className="w-full text-green-600 text-sm font-semibold py-3 border-2 border-green-200 rounded-xl hover:bg-green-50">
            🔐 Forgot PIN? Reset it
          </button>
          <p className="text-center text-xs text-gray-400">
            Not registered?{' '}
            <a href="https://igembe-dashboard.netlify.app/register"
              className="text-green-600 font-semibold">
              Register here →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}