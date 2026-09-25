import { useState, useEffect } from 'react'
import SaccoLogo from './SaccoLogo'

// Chrome/Android fire `beforeinstallprompt`, which we capture and defer so
// we can show it on our own timing via a normal button instead of relying on
// the browser's own (easy-to-miss) install icon. iOS Safari never fires this
// event at all — there's no programmatic install trigger there, only the
// manual Share → Add to Home Screen flow, so that gets a text hint instead.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('igembe_install_dismissed') === '1') setDismissed(true)
    } catch {}

    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
    )
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    try { localStorage.setItem('igembe_install_dismissed', '1') } catch {}
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  if (isStandalone || dismissed) return null
  if (!deferredPrompt && !isIOS) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[9997] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 flex items-center gap-3">
      <SaccoLogo size={44} />
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-gray-900">Install Igembe SACCO</p>
        {isIOS && !deferredPrompt ? (
          <p className="text-xs text-gray-500 mt-0.5">Tap Share, then "Add to Home Screen"</p>
        ) : (
          <p className="text-xs text-gray-500 mt-0.5">Add to your home screen for quick access</p>
        )}
      </div>
      {!isIOS && deferredPrompt && (
        <button onClick={handleInstall} className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0">
          Install
        </button>
      )}
      <button onClick={dismiss} className="text-gray-300 text-lg font-bold flex-shrink-0 px-1">×</button>
    </div>
  )
}
