const STAGES: { key: string; label: string }[] = [
  { key: 'scheduled',          label: 'Scheduled' },
  { key: 'confirmed',          label: 'Confirmed' },
  { key: 'harvesting',         label: 'Harvesting' },
  { key: 'picked_up',          label: 'Picked Up' },
  { key: 'delivered_to_sacco', label: 'At SACCO' },
  { key: 'graded',             label: 'Graded' },
  { key: 'paid',               label: 'Paid' },
]

// Compact horizontal stepper for a harvest card — dots + connecting line,
// with only the CURRENT stage labeled (all 7 labels would never fit on a
// phone width). Filled green up to and including the current stage.
export default function HarvestStepper({ status }: { status: string }) {
  const found = STAGES.findIndex(s => s.key === status)
  const idx = found === -1 ? 0 : found

  return (
    <div className="py-1">
      <div className="flex items-center">
        {STAGES.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${i <= idx ? 'bg-green-500' : 'bg-gray-200'}`} />
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-0.5 transition-colors ${i < idx ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-[10px] font-bold text-green-700 mt-1">{STAGES[idx].label}</p>
    </div>
  )
}
