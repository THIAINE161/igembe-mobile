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
  const [showPin, setShowPin] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) { setError('PIN must be exactly 4 digits'); return }
    setLoading(true)
    setError('')
    try {
      const response = await api.post('/api/mobile/login', { phoneNumber: phone, pin })
      const { token, roles, member, agent, driver } = response.data
      const agentData = agent || driver
      login(token, member, agentData, roles)
      if (roles.length > 1) {
        navigate('/select-role')
      } else if (roles[0] === 'farmer') {
        navigate('/farmer')
      } else {
        navigate('/agent')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Check your phone number.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: '#14532d' }}>

      {/* Real miraa photo — more visible */}
      {!imgError && (
        <img
          src="/miraa.jpg"
          alt="Miraa"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ opacity: imgLoaded ? 0.40 : 0 }}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}

      {/* SVG fallback */}
      {imgError && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg viewBox="0 0 400 700" xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 w-full h-full opacity-15">
            <path d="M200 700 Q190 500 180 300 Q175 200 200 100" stroke="#4ade80" strokeWidth="6" fill="none"/>
            <path d="M200 700 Q220 500 230 300 Q240 200 220 80" stroke="#4ade80" strokeWidth="5" fill="none"/>
            <path d="M200 700 Q160 520 140 350 Q130 250 150 150" stroke="#4ade80" strokeWidth="4" fill="none"/>
            <path d="M200 700 Q240 520 260 350 Q270 250 250 150" stroke="#4ade80" strokeWidth="4" fill="none"/>
            <ellipse cx="170" cy="280" rx="45" ry="20" fill="#22c55e" opacity="0.6" transform="rotate(-30 170 280)"/>
            <ellipse cx="230" cy="260" rx="40" ry="18" fill="#16a34a" opacity="0.6" transform="rotate(25 230 260)"/>
            <ellipse cx="150" cy="200" rx="35" ry="16" fill="#22c55e" opacity="0.5" transform="rotate(-45 150 200)"/>
            <ellipse cx="250" cy="190" rx="38" ry="17" fill="#15803d" opacity="0.5" transform="rotate(40 250 190)"/>
          </svg>
        </div>
      )}

      {/* Lighter gradient so photo is more visible */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(20,83,45,0.55) 0%, rgba(20,83,45,0.35) 45%, white 100%)' }} />

      {/* TOP SECTION */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl"
          style={{ border: '4px solid rgba(74,222,128,0.4)' }}>
          <span className="text-green-700 text-4xl font-black">IG</span>
        </div>
        <h1 className="text-4xl font-black text-white mb-1 text-center drop-shadow-lg">
          Igembe SACCO
        </h1>
        <p className="text-green-100 text-center drop-shadow font-medium">
          Member & Agent Portal
        </p>
        <p className="text-green-200 text-sm text-center mt-1">
          🌿 Igembe South, Meru County
        </p>

        <div className="mt-6 px-5 py-4 rounded-2xl text-center w-full max-w-xs"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)' }}>
          <p className="text-green-100 text-xs mb-1">📊 Live Miraa Prices</p>
          <p className="text-white text-sm font-bold">Sign in to see today's rates</p>
        </div>
      </div>

      {/* LOGIN CARD */}
      <div className="relative z-10 bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
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
              <span className="text-green-600 text-xs ml-2 font-normal">
                (First time? Any 4 digits sets your PIN)
              </span>
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
            <div className="flex justify-center gap-2 mt-3">
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
            className="w-full text-white font-black py-5 rounded-2xl text-xl transition-all shadow-lg"
            style={{
              backgroundColor: pin.length === 4 && !loading ? '#16a34a' : '#86efac'
            }}
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
            className="w-full text-green-700 text-sm font-semibold py-3 border-2 border-green-200 rounded-xl hover:bg-green-50">
            🔐 Forgot PIN? Reset it
          </button>
          <p className="text-center text-xs text-gray-400">
            Not registered?{' '}
            <a href="https://igembe-dashboard.netlify.app/register"
              className="text-green-600 font-semibold">
              Register as SACCO Member →
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          © 2026 Igembe Tech Solutions Ltd
        </p>
      </div>
    </div>
  )
}