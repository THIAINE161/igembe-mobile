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
      if (roles.length > 1) navigate('/select-role')
      else if (roles[0] === 'farmer') navigate('/farmer')
      else navigate('/agent')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Check your phone number.')
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Full-screen on ALL devices — no phone frame */
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden"
      style={{ backgroundColor: '#14532d' }}>

      {/* Miraa photo — more visible (opacity 0.50) */}
      {!imgError && (
        <img src="/miraa.jpg" alt="Miraa"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: imgLoaded ? 0.50 : 0 }}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)} />
      )}

      {/* SVG fallback */}
      {imgError && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg viewBox="0 0 400 700" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full opacity-15">
            <path d="M200 700 Q190 500 180 300 Q175 200 200 100" stroke="#4ade80" strokeWidth="6" fill="none"/>
            <path d="M200 700 Q220 500 230 300 Q240 200 220 80" stroke="#4ade80" strokeWidth="5" fill="none"/>
            <ellipse cx="170" cy="280" rx="45" ry="20" fill="#22c55e" opacity="0.6" transform="rotate(-30 170 280)"/>
            <ellipse cx="230" cy="260" rx="40" ry="18" fill="#16a34a" opacity="0.6" transform="rotate(25 230 260)"/>
          </svg>
        </div>
      )}

      {/* Gradient overlay — reduced for better photo visibility */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(160deg, rgba(20,83,45,0.65) 0%, rgba(20,83,45,0.45) 50%, rgba(20,83,45,0.75) 100%)' }} />

      {/* LEFT PANEL — Hero section — takes 50% on desktop */}
      <div className="relative z-10 flex flex-col justify-center px-8 py-12 lg:w-1/2 lg:min-h-screen">
        <div className="max-w-lg">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
            <span className="text-green-700 text-3xl font-black">IG</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-3 drop-shadow-lg">
            Igembe SACCO
          </h1>
          <p className="text-xl text-green-200 font-medium mb-2">Member & Agent Portal</p>
          <p className="text-green-300">🌿 Igembe South, Meru County</p>

          {/* Features on desktop */}
          <div className="hidden lg:grid grid-cols-2 gap-3 mt-10">
            {[
              { icon: '📊', t: 'Live Miraa Prices', d: 'Grade 1, 2 & Gomba daily' },
              { icon: '💰', t: 'M-Pesa Payments', d: 'Instant deposits & withdrawals' },
              { icon: '🧑‍🌾', t: 'Harvest Tracking', d: 'Agent oversees your farm' },
              { icon: '🌱', t: 'AgroVet Shop', d: 'Order inputs & supplies' },
            ].map((f, i) => (
              <div key={i} className="rounded-2xl p-4" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span className="text-2xl">{f.icon}</span>
                <p className="text-white font-bold text-sm mt-1">{f.t}</p>
                <p className="text-green-200 text-xs">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Login form */}
      <div className="relative z-10 flex items-center justify-center lg:w-1/2 lg:min-h-screen px-4 pb-8 lg:pb-0">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-5">
              <h2 className="text-xl font-black text-white">Sign In</h2>
              <p className="text-green-200 text-sm">Phone number & 4-digit PIN</p>
            </div>

            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2">
                  <span className="flex-shrink-0">⚠️</span><span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">📱 Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0712345678" required
                    className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-green-500 bg-gray-50" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    🔐 4-Digit PIN
                    <span className="text-green-600 text-xs ml-2 font-normal">(First time? Set your PIN)</span>
                  </label>
                  <div className="relative">
                    <input type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 4) setPin(v) }}
                      placeholder="••••" maxLength={4} required inputMode="numeric"
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl tracking-widest text-center focus:outline-none focus:border-green-500 bg-gray-50 pr-12" />
                    <button type="button" onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPin ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="flex justify-center gap-2 mt-3">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`w-3 h-3 rounded-full transition-all ${pin.length > i ? 'bg-green-600 scale-110' : 'bg-gray-200'}`} />
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={loading || pin.length !== 4}
                  className="w-full text-white font-black py-4 rounded-2xl text-xl transition-all shadow-lg"
                  style={{ backgroundColor: pin.length === 4 && !loading ? '#16a34a' : '#86efac' }}>
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
                  <a href="https://igembe-dashboard.netlify.app/register" className="text-green-600 font-semibold">
                    Register as SACCO Member →
                  </a>
                </p>
              </div>

              <p className="text-center text-xs text-gray-300 mt-5">
                © 2026 Igembe Tech Solutions Ltd
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}