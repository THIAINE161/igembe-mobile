import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

type Mode = 'login' | 'forgot' | 'reset'

export default function MobileLoginPage() {
  const navigate = useNavigate()
  const { login } = useMobileStore()
  const [mode, setMode] = useState<Mode>('login')

  // Login state
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [imgLoaded, setImgLoaded] = useState(false)

  // Forgot/Reset state
  const [resetPhone, setResetPhone] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [resetStep, setResetStep] = useState<1 | 2>(1)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [resetError, setResetError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length !== 4) { setError('PIN must be exactly 4 digits'); return }
    setLoading(true)
    setError('')
    try {
      const r = await api.post('/api/mobile/login', { phoneNumber: phone, pin })
      const { token, roles, member, agent, driver } = r.data
      login(token, member, agent || driver, roles)
      if (roles.length > 1) navigate('/select-role')
      else if (roles[0] === 'farmer') navigate('/farmer')
      else navigate('/agent')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Check your phone number and PIN.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPin = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetError('')
    setResetMsg('')
    try {
      const r = await api.post('/api/mobile/forgot-pin', { phoneNumber: resetPhone })
      setResetMsg(r.data.message || 'Reset code sent!')
      if (r.data.debugCode) setResetCode(r.data.debugCode) // dev only
      setResetStep(2)
    } catch (err: any) {
      setResetError(err.response?.data?.error || 'Failed. Check your phone number.')
    } finally {
      setResetLoading(false)
    }
  }

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPin.length !== 4) { setResetError('PIN must be 4 digits'); return }
    if (newPin !== confirmPin) { setResetError('PINs do not match'); return }
    setResetLoading(true)
    setResetError('')
    try {
      await api.post('/api/mobile/reset-pin', { phoneNumber: resetPhone, resetCode, newPin })
      setResetMsg('PIN reset successfully! You can now login.')
      setTimeout(() => {
        setMode('login')
        setResetStep(1)
        setResetPhone('')
        setResetCode('')
        setNewPin('')
        setConfirmPin('')
        setResetMsg('')
      }, 2500)
    } catch (err: any) {
      setResetError(err.response?.data?.error || 'Failed. Check your reset code.')
    } finally {
      setResetLoading(false)
    }
  }

  const BgOverlay = () => (
    <div className="absolute inset-0 pointer-events-none">
      <img src="/miraa.jpg" alt=""
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity: imgLoaded ? 0.50 : 0 }}
        onLoad={() => setImgLoaded(true)}
        onError={() => {}} />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(20,83,45,0.70) 0%, rgba(20,83,45,0.45) 50%, rgba(20,83,45,0.80) 100%)' }} />
    </div>
  )

  // ── FORGOT PIN ─────────────────────────────────────────────────────────────
  if (mode === 'forgot') return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden" style={{ backgroundColor: '#14532d' }}>
      <BgOverlay />
      <div className="relative z-10 flex items-center justify-center w-full min-h-screen px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-5">
              <button onClick={() => { setMode('login'); setResetStep(1); setResetError(''); setResetMsg('') }}
                className="text-orange-200 text-sm mb-2">← Back to Login</button>
              <h2 className="text-xl font-black text-white">🔐 Reset PIN</h2>
              <p className="text-orange-200 text-sm">{resetStep === 1 ? 'Enter your registered phone number' : 'Enter the code sent to your phone'}</p>
            </div>
            <div className="p-6">
              {resetMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">
                  ✅ {resetMsg}
                </div>
              )}
              {resetError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                  ⚠️ {resetError}
                </div>
              )}

              {resetStep === 1 ? (
                <form onSubmit={handleForgotPin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📱 Registered Phone Number</label>
                    <input type="tel" value={resetPhone} onChange={e => setResetPhone(e.target.value)}
                      placeholder="e.g. 0712345678" required
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-orange-500" />
                  </div>
                  <button type="submit" disabled={resetLoading || !resetPhone}
                    className="w-full bg-orange-600 disabled:bg-orange-300 text-white font-black py-4 rounded-2xl text-lg">
                    {resetLoading ? 'Sending...' : 'Send Reset Code →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📨 Reset Code (from SMS)</label>
                    <input type="text" value={resetCode} onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit code" maxLength={6} required
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-2xl tracking-widest text-center focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">🔐 New 4-Digit PIN</label>
                    <input type="password" value={newPin}
                      onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 4) setNewPin(v) }}
                      placeholder="••••" maxLength={4} inputMode="numeric" required
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl tracking-widest text-center focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">🔐 Confirm New PIN</label>
                    <input type="password" value={confirmPin}
                      onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 4) setConfirmPin(v) }}
                      placeholder="••••" maxLength={4} inputMode="numeric" required
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl tracking-widest text-center focus:outline-none focus:border-orange-500" />
                    {newPin && confirmPin && newPin !== confirmPin && (
                      <p className="text-red-500 text-xs mt-1">PINs do not match</p>
                    )}
                  </div>
                  <button type="submit"
                    disabled={resetLoading || resetCode.length < 6 || newPin.length < 4 || newPin !== confirmPin}
                    className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg">
                    {resetLoading ? 'Resetting...' : '✅ Reset PIN'}
                  </button>
                  <button type="button" onClick={() => setResetStep(1)}
                    className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl">
                    ← Resend Code
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden" style={{ backgroundColor: '#14532d' }}>
      <BgOverlay />

      {/* Hero — left on desktop */}
      <div className="relative z-10 flex flex-col justify-center px-8 py-12 lg:w-1/2 lg:min-h-screen">
        <div className="max-w-lg">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
            <span className="text-green-700 text-3xl font-black">IG</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-3 drop-shadow-lg">
            Igembe SACCO
          </h1>
          <p className="text-xl text-green-200 font-medium mb-2">Farmer & Agent Portal</p>
          <p className="text-green-300 mb-8">🌿 Igembe South, Meru County</p>
          <div className="hidden lg:grid grid-cols-2 gap-3">
            {[
              { icon: '📊', t: 'Live Miraa Prices', d: 'Grade 1, 2 & Gomba daily' },
              { icon: '💰', t: 'M-Pesa Payments', d: 'Instant deposits & withdrawals' },
              { icon: '🧑‍🌾', t: 'Harvest Tracking', d: 'Real-time agent updates' },
              { icon: '🌱', t: 'AgroVet Shop', d: 'Order farm inputs online' },
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

      {/* Login form — right on desktop */}
      <div className="relative z-10 flex items-center justify-center lg:w-1/2 lg:min-h-screen px-4 pb-8 lg:pb-0">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 to-green-600 px-6 py-5">
              <h2 className="text-xl font-black text-white">Sign In</h2>
              <p className="text-green-200 text-sm">Phone number & 4-digit PIN</p>
            </div>
            <div className="p-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-2">
                  <span>⚠️</span><span>{error}</span>
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
                    <span className="text-green-600 text-xs ml-2 font-normal">(First time? Your PIN will be set on login)</span>
                  </label>
                  <div className="relative">
                    <input type={showPin ? 'text' : 'password'} value={pin}
                      onChange={e => { const v = e.target.value.replace(/\D/g, ''); if (v.length <= 4) setPin(v) }}
                      placeholder="••••" maxLength={4} required inputMode="numeric"
                      className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-3xl tracking-widest text-center focus:outline-none focus:border-green-500 bg-gray-50 pr-12" />
                    <button type="button" onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                      {showPin ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <div className="flex justify-center gap-2 mt-3">
                    {[0, 1, 2, 3].map(i => (
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
                <button onClick={() => { setMode('forgot'); setResetPhone(phone); setResetError(''); setResetMsg('') }}
                  className="w-full text-orange-600 text-sm font-semibold py-3 border-2 border-orange-200 rounded-xl hover:bg-orange-50 flex items-center justify-center gap-2">
                  🔐 Forgot PIN? Click here to reset
                </button>
                <p className="text-center text-xs text-gray-400">
                  Not registered?{' '}
                  <a href="https://igembe-dashboard.netlify.app/register" className="text-green-600 font-semibold">
                    Register as SACCO Member →
                  </a>
                </p>
              </div>
              <p className="text-center text-xs text-gray-300 mt-5">© 2026 Igembe Tech Solutions Ltd</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}