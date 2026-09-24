import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import LanguageSwitcher from '../components/LanguageSwitcher'
import SaccoLogo from '../components/SaccoLogo'
import { useT } from '../lib/useT'
import api from '../lib/api'

export default function MobileLoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useMobileStore()
  const t = useT()

  const [phoneNumber, setPhoneNumber] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const cleanPhone = phoneNumber.replace(/\s/g, '').trim()
    if (!cleanPhone) { setError(t('login.errPhoneRequired')); return }
    if (!pin || pin.length !== 4) { setError(t('login.errPinRequired')); return }

    setLoading(true)
    try {
      const res = await api.post('/api/mobile/login', { phoneNumber: cleanPhone, pin })
      const data = res.data
      setAuth({
        token:  data.token,
        roles:  data.roles  || [],
        member: data.member || null,
        agent:  data.agent  || null,
        driver: data.driver || null
      })
      if (data.roles?.includes('farmer')) navigate('/farmer', { replace: true })
      else if (data.roles?.includes('agent')) navigate('/agent', { replace: true })
      else setError(t('login.errUnknownAccount'))
    } catch (err: any) {
      if (!err.response) {
        setError('📡 No internet connection. Please connect to WiFi or mobile data to login.')
      } else if (err.response.status === 401) {
        setError('❌ Wrong phone number or PIN. Try again or use Forgot PIN.')
      } else if (err.response.status === 500) {
        setError('⚠️ Server temporarily unavailable. Please try again in a moment.')
      } else {
        setError(err.response?.data?.error || t('login.errLoginFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* ── Miraa farm background ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Fallback gradient (shown while image loads) */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900 via-green-800 to-green-900" style={{ zIndex: -1 }} />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-950/80 via-green-900/75 to-green-950/90" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <div className="flex-1 flex flex-col items-center justify-center px-5 pt-16 pb-6">

          {/* Language toggle */}
          <div className="mb-4">
            <LanguageSwitcher variant="light" />
          </div>

          {/* Logo */}
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4"><SaccoLogo /></div>
            <h1 className="text-white text-3xl font-black text-center drop-shadow-xl tracking-tight">
              Igembe SACCO
            </h1>
            <p className="text-green-300 text-sm text-center mt-1">
              {t('login.tagline')}
            </p>
          </div>

          {/* Card */}
          <div className="w-full max-w-sm bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-7">
            <h2 className="text-xl font-black text-gray-900">{t('login.welcomeBack')}</h2>
            <p className="text-gray-400 text-xs mt-0.5 mb-5">{t('login.signInSubtitle')}</p>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-4">
                <span className="flex-shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('login.phoneLabel')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📱</span>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="0712 345 678"
                    inputMode="numeric"
                    autoComplete="tel"
                    required
                    className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-sm font-medium text-gray-900 placeholder-gray-300 focus:outline-none focus:border-green-500 bg-gray-50/80 transition-colors"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('login.phoneHint')}</p>
              </div>

              {/* PIN */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  {t('login.pinLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="••••"
                    inputMode="numeric"
                    maxLength={4}
                    required
                    className="w-full px-6 pr-14 py-4 border-2 border-gray-200 rounded-2xl text-4xl font-black tracking-[0.4em] text-center text-gray-900 focus:outline-none focus:border-green-500 bg-gray-50/80 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPin(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl select-none">
                    {showPin ? '🙈' : '👁️'}
                  </button>
                </div>
                {/* PIN dots */}
                <div className="flex justify-center gap-3 mt-2.5">
                  {[0,1,2,3].map(i => (
                    <div key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${pin.length > i ? 'bg-green-600 scale-125' : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Hint */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                <p className="text-xs text-blue-700">
                  <span className="font-bold">{t('login.firstTimeTitle')}</span> {t('login.firstTimeHint')}
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    {t('login.signingIn')}
                  </>
                ) : t('login.signIn')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={() => navigate('/forgot-pin')}
                className="text-green-600 text-sm font-bold hover:text-green-700 transition-colors">
                {t('login.forgotPin')}
              </button>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-5 text-center">
            <p className="text-green-400 text-xs">{t('login.notRegistered')}</p>
            <p className="text-green-300 text-sm font-bold mt-1">📞 0757 630 995</p>
          </div>
        </div>

        {/* Footer */}
        <div className="relative pb-5 text-center">
          <p className="text-green-600/80 text-xs">{t('login.poweredBy')}</p>
        </div>
      </div>
    </div>
  )
}