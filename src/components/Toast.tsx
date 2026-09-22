import { useToastStore } from '../store/toastStore'

// Rendered once in App.tsx. Sits above the fixed bottom tab bar (~64-72px
// tall) so it isn't covered by the nav on farmer/agent screens.
export default function Toast() {
  const toasts = useToastStore(s => s.toasts)
  const dismissToast = useToastStore(s => s.dismissToast)

  if (!toasts.length) return null

  return (
    <div style={{ position: 'fixed', bottom: '90px', right: '16px', zIndex: 10000 }}
      className="flex flex-col gap-2 items-end">
      {toasts.map(t => (
        <div key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`toast-in px-4 py-3 rounded-2xl shadow-xl text-sm font-bold text-white cursor-pointer max-w-[240px] ${
            t.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
          {t.type === 'success' ? '✅ ' : '⚠️ '}{t.message}
        </div>
      ))}
    </div>
  )
}
