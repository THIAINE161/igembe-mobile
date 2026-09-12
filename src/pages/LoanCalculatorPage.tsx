import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'
import {
  INTEREST_RATE, TERM_OPTIONS, MIN_LOAN_AMOUNT, MAX_LOAN_AMOUNT,
  computeLoanFigures, buildAmortizationSchedule, LOAN_SCORE_TIERS
} from '../lib/loanConfig'

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

const TIPS = [
  { icon: '✅', text: 'Complete loans on time — each fully repaid loan adds up to 20 points to your score (max 40 pts).' },
  { icon: '🌿', text: 'Keep harvesting and getting paid — every paid harvest adds 5 points (up to 25 pts).' },
  { icon: '📈', text: 'Grow your harvest earnings — passing KES 50,000 total adds 10 pts; passing KES 100,000 adds 5 more.' },
  { icon: '💵', text: 'Build your savings balance — every KES 3,000 saved adds roughly 1 point (up to 15 pts).' },
  { icon: '⚡', text: 'Repay fast — finishing a loan in under 90 days on average earns a 5 pt bonus.' },
  { icon: '⚠️', text: 'Avoid defaults — a defaulted loan costs 30 points and takes a long time to recover from.' },
]

export default function LoanCalculatorPage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()

  const [amount, setAmount] = useState(50000)
  const [term, setTerm] = useState(12)
  const [showFullSchedule, setShowFullSchedule] = useState(false)

  const [harvests, setHarvests] = useState<any[]>([])
  const [loadingHarvests, setLoadingHarvests] = useState(true)

  useEffect(() => {
    if (!member?.id) { navigate('/login', { replace: true }); return }
    api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      .then(r => setHarvests(r.data?.data?.recentHarvests || []))
      .catch(() => setHarvests([]))
      .finally(() => setLoadingHarvests(false))
  }, [member?.id])

  const { monthly, totalPayable, totalInterest } = useMemo(
    () => computeLoanFigures(amount, term),
    [amount, term]
  )

  const schedule = useMemo(() => buildAmortizationSchedule(amount, term), [amount, term])
  const visibleSchedule = showFullSchedule ? schedule : schedule.slice(0, 6)

  // ── "Can I afford this?" — average monthly earnings from paid harvests ────
  // Note: the dashboard API only returns the 10 most recent harvests, so this
  // is an estimate based on recent history, not a full lifetime average.
  const affordability = useMemo(() => {
    const paid = harvests.filter((h: any) => h.status === 'paid' && (h.items || []).length > 0)
    if (!paid.length) return null

    const totalEarnings = paid.reduce((s: number, h: any) =>
      s + (h.items || []).reduce((x: number, i: any) => x + Number(i.totalValue || 0), 0), 0)

    const months = new Set(
      paid.map((h: any) => h.harvestDate ? new Date(h.harvestDate).toISOString().slice(0, 7) : null).filter(Boolean)
    )
    const monthsCount = Math.max(1, months.size)
    const avgMonthly = totalEarnings / monthsCount

    return { avgMonthly, totalEarnings, monthsCount }
  }, [harvests])

  const affordabilityRatio = affordability && affordability.avgMonthly > 0 ? monthly / affordability.avgMonthly : null
  const verdict = affordabilityRatio == null ? null
    : affordabilityRatio <= 0.3 ? { label: 'Comfortable', emoji: '✅', color: 'bg-green-50 border-green-200 text-green-700' }
    : affordabilityRatio <= 0.5 ? { label: 'Manageable, but tight', emoji: '⚠️', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' }
    : { label: 'May be difficult', emoji: '🚫', color: 'bg-red-50 border-red-200 text-red-700' }

  const currentScore = Number(member?.loanScore || 0)

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-5">
        <button onClick={() => navigate(-1)} className="text-green-200 text-sm mb-4 block">← Back</button>
        <h1 className="text-white text-xl font-black">🧮 Loan Calculator</h1>
        <p className="text-green-200 text-sm mt-1">Plan your loan before you apply</p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {/* ── Inputs ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
          <div>
            <div className="flex justify-between items-baseline mb-2">
              <label className="text-sm font-bold text-gray-700">Loan Amount</label>
              <span className="text-2xl font-black text-green-700">KES {amount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={MIN_LOAN_AMOUNT}
              max={MAX_LOAN_AMOUNT}
              step={1000}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="w-full accent-green-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>KES {MIN_LOAN_AMOUNT.toLocaleString()}</span>
              <span>KES {MAX_LOAN_AMOUNT.toLocaleString()}</span>
            </div>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(Math.min(MAX_LOAN_AMOUNT, Math.max(0, Number(e.target.value) || 0)))}
              min={MIN_LOAN_AMOUNT}
              max={MAX_LOAN_AMOUNT}
              inputMode="numeric"
              className="w-full mt-3 px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-black text-center focus:outline-none focus:border-green-500 bg-gray-50"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Repayment Period</label>
            <div className="grid grid-cols-3 gap-2">
              {TERM_OPTIONS.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTerm(t)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${term === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                >
                  {t} mo
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Real-time results ────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center border border-gray-100">
            <p className="text-[10px] text-gray-400 font-medium">Monthly Payment</p>
            <p className="text-sm font-black text-green-700 mt-1">KES {Math.round(monthly).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center border border-gray-100">
            <p className="text-[10px] text-gray-400 font-medium">Total Interest</p>
            <p className="text-sm font-black text-orange-600 mt-1">KES {Math.round(totalInterest).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-3 text-center border border-gray-100">
            <p className="text-[10px] text-gray-400 font-medium">Total Payable</p>
            <p className="text-sm font-black text-gray-900 mt-1">KES {Math.round(totalPayable).toLocaleString()}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center -mt-2">At {INTEREST_RATE}% per annum, reducing balance</p>

        {/* ── Can I afford this? ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-black text-gray-900 mb-3">🤔 Can I Afford This?</p>
          {loadingHarvests ? (
            <div className="flex items-center justify-center py-6"><Spinner /></div>
          ) : !affordability ? (
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-sm">Not enough paid-harvest history yet to estimate this.</p>
              <p className="text-gray-400 text-xs mt-1">Complete a few harvests and check back here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Your avg. monthly harvest earnings</span>
                <span className="font-bold text-gray-900">KES {Math.round(affordability.avgMonthly).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">This loan's monthly payment</span>
                <span className="font-bold text-gray-900">KES {Math.round(monthly).toLocaleString()}</span>
              </div>
              {verdict && affordabilityRatio != null && (
                <div className={`rounded-xl p-3 border ${verdict.color}`}>
                  <p className="font-bold text-sm">{verdict.emoji} {verdict.label}</p>
                  <p className="text-xs mt-1 opacity-90">
                    This payment is about {Math.round(affordabilityRatio * 100)}% of your average monthly harvest earnings
                    {affordabilityRatio > 0.5 ? ' — consider a smaller amount or longer term.' : '.'}
                  </p>
                </div>
              )}
              <p className="text-[10px] text-gray-400">Based on your {affordability.monthsCount} most recent month(s) of paid harvests.</p>
            </div>
          )}
        </div>

        {/* ── Repayment schedule ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-black text-gray-900">📅 Repayment Schedule</p>
            <p className="text-xs text-gray-400 mt-0.5">Month-by-month breakdown</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="text-left px-3 py-2 font-bold">Mo.</th>
                  <th className="text-right px-3 py-2 font-bold">Principal</th>
                  <th className="text-right px-3 py-2 font-bold">Interest</th>
                  <th className="text-right px-3 py-2 font-bold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleSchedule.map(row => (
                  <tr key={row.month}>
                    <td className="px-3 py-2 font-bold text-gray-700">{row.month}</td>
                    <td className="px-3 py-2 text-right text-gray-700">{Math.round(row.principalPaid).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-orange-600">{Math.round(row.interestPaid).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">{Math.round(row.balance).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {schedule.length > 6 && (
            <button
              onClick={() => setShowFullSchedule(v => !v)}
              className="w-full py-3 text-xs font-bold text-green-600 border-t border-gray-100"
            >
              {showFullSchedule ? '▲ Show less' : `▼ Show all ${schedule.length} months`}
            </button>
          )}
        </div>

        {/* ── Loan score tiers ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-black text-gray-900 mb-1">📊 Loan Score → Max Amount</p>
          <p className="text-xs text-gray-400 mb-3">Your current score: <span className="font-bold text-green-700">{currentScore}/100</span></p>
          <div className="space-y-1.5">
            {LOAN_SCORE_TIERS.map((tier, i) => {
              const next = LOAN_SCORE_TIERS[i + 1]
              const isCurrent = currentScore >= tier.minScore && (!next || currentScore < next.minScore)
              return (
                <div key={tier.minScore}
                  className={`flex justify-between items-center rounded-xl px-3 py-2 ${isCurrent ? 'bg-green-50 border border-green-300' : 'bg-gray-50'}`}>
                  <span className={`text-sm ${isCurrent ? 'font-black text-green-700' : 'text-gray-600'}`}>
                    {tier.minScore}+ pts {isCurrent && '· You are here'}
                  </span>
                  <span className={`text-sm font-bold ${isCurrent ? 'text-green-700' : 'text-gray-900'}`}>
                    up to KES {tier.maxAmount.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Tips ─────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-2xl p-4">
          <p className="font-bold text-green-800 text-sm mb-2">💡 How to Increase Your Loan Limit</p>
          <div className="space-y-2">
            {TIPS.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-green-700">
                <span className="flex-shrink-0">{tip.icon}</span>
                <span>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Apply now ────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate(`/farmer/loan/apply?amount=${amount}&term=${term}`)}
          className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-lg"
        >
          Apply Now →
        </button>
      </div>
    </div>
  )
}
