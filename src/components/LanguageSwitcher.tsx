import { useMobileStore } from '../store/mobileStore'
import { LANGUAGES } from '../lib/i18n'

// Compact pill-style language toggle. `variant="light"` is for dark/colored
// backgrounds (login page); default is for white cards (profile tab).
export default function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'light' }) {
  const { language, setLanguage } = useMobileStore()

  const base = 'flex gap-1 p-1 rounded-2xl'
  const wrapCls = variant === 'light' ? `${base} bg-white/15` : `${base} bg-gray-100`

  return (
    <div className={wrapCls}>
      {LANGUAGES.map(l => {
        const isActive = language === l.code
        return (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isActive
                ? variant === 'light'
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'bg-white text-green-700 shadow-sm'
                : variant === 'light'
                  ? 'text-white/80'
                  : 'text-gray-500'
            }`}
          >
            {l.native}
          </button>
        )
      })}
    </div>
  )
}
