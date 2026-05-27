import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

// ── safe converters ────────────────────────────────────────────────────────────
const num = (v: any): number => {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

// ── tiny reusable buttons ──────────────────────────────────────────────────────
function QuickBtn({
  emoji, label, color, onClick
}: { emoji: string; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${color} active:opacity-70 transition-opacity`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  )
}

function NavBtn({
  emoji, label, active, onClick
}: { emoji: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1 px-2 min-w-0">
      <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </button>
  )
}

// ── status helpers ─────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  scheduled: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  harvesting: 'bg-lime-100 text-lime-700',
  picked_up: 'bg-purple-100 text-purple-700',
  delivered_to_sacco: 'bg-orange-100 text-orange-700',
  graded: 'bg-teal-100 text-teal-700',
  paid: 'bg-green-100 text-green-700',
}

const STATUS_DESC: Record<string, string> = {
  scheduled: '⏳ Waiting for agent assignment',
  confirmed: '🧑‍🌾 Agent assigned — coming to your farm',
  harvesting: '🌿 Agent currently harvesting your miraa',
  picked_up: '📦 Miraa collected — in transit to SACCO',
  delivered_to_sacco: '🏭 Arrived at SACCO — awaiting grading',
  graded: '✅ Graded — payment being processed',
  paid: '💰 Payment sent to your M-Pesa!',
}

const PROGRESS_W: Record<string, string> = {
  scheduled: 'w-1/6',
  confirmed: 'w-2/6',
  harvesting: 'w-3/6',
  picked_up: 'w-4/6',
  delivered_to_sacco: 'w-5/6',
  graded: 'w-5/6',
  paid: 'w-full',
}

const PROGRESS_C: Record<string, string> = {
  scheduled: 'bg-yellow-400',
  confirmed: 'bg-blue-500',
  harvesting: 'bg-lime-500',
  picked_up: 'bg-purple-500',
  delivered_to_sacco: 'bg-orange-500',
  graded: 'bg-teal-500',
  paid: 'bg-green-500',
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner({ size = 6 }: { size?: number }) {
  return (
    <svg
      className={`animate-spin h-${size} w-${size} text-green-600`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function FarmerDashboard() {
  const navigate = useNavigate()
  const { member, roles, logout, setActiveRole } = useMobileStore()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'home' | 'harvests' | 'savings' | 'loans'>('home')

  // ── auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!member?.id) {
      navigate('/login', { replace: true })
      return
    }

    loadDashboard()

    // soft refresh every 90 s
    const id = setInterval(() => loadDashboard(false), 90_000)

    return () => clearInterval(id)
  }, [member?.id]) // eslint-disable-line

  const loadDashboard = async (showSpinner = true) => {
    if (!member?.id) return

    if (showSpinner) setLoading(true)
    else setRefreshing(true)

    setError('')

    try {
      const r = await api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      const d = r?.data?.data

      if (!d) throw new Error('Empty response from server')

      setData(d)
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Connection failed'

      if (showSpinner) setError(msg)

      console.error('Dashboard error:', msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ── redirect if not authenticated ───────────────────────────────────────────
  if (!member) {
    navigate('/login', { replace: true })
    return null
  }

  // ── loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center shadow-xl">
          <span className="text-white text-3xl font-black">IG</span>
        </div>

        <Spinner size={8} />

        <p className="text-gray-500 text-sm">Loading your dashboard…</p>
      </div>
    )
  }

  // ── error screen ────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 gap-4">
        <p className="text-5xl">⚠️</p>

        <p className="font-bold text-gray-900">Failed to load dashboard</p>

        <p className="text-gray-500 text-sm text-center">{error}</p>

        <button
          onClick={() => loadDashboard()}
          className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ── unpack data safely ──────────────────────────────────────────────────────
  const memberInfo = data?.member ?? member

  // FIXED: Separate savings vs shares
  const savingsAccounts =
    data?.savingsAccounts?.filter((a: any) => a.accountType === 'savings') || []

  const shareAccounts =
    data?.savingsAccounts?.filter((a: any) => a.accountType === 'shares') || []

  const totalSavings = savingsAccounts.reduce(
    (s: number, a: any) => s + Number(a.balance),
    0
  )

  // FIXED: Fetch all loans
  const allLoans = data?.activeLoans || []

  const shareCapital =
    data?.shareCapital ?? {
      units: 0,
      valuePerUnit: 100,
      totalValue: 0,
      balance: 0,
    }

  const recentHarvests = data?.recentHarvests ?? []
  const prices = data?.currentPrices ?? []
  const announcements = data?.announcements ?? []
  const todayLimit = data?.todayLimit ?? null

  const hour = new Date().getHours()

  const greeting =
    hour < 12
      ? '🌅 Good morning'
      : hour < 17
      ? '☀️ Good afternoon'
      : '🌙 Good evening'

  // ── harvest card helper ─────────────────────────────────────────────────────
  const HarvestCard = ({ h, compact = false }: { h: any; compact?: boolean }) => {
    const totalVal = (h.items ?? []).reduce(
      (s: number, i: any) => s + num(i.totalValue),
      0
    )

    return (
      <div className="border border-gray-100 rounded-2xl overflow-hidden">
        {/* card header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
          <div className="flex items-center gap-2">
            <span>🌿</span>

            <span className="font-black text-sm text-gray-900">
              {h.harvestNumber || h.harvest_number}
            </span>
          </div>

          <span
            className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${
              STATUS_COLOR[h.status] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {(h.status ?? '').replace(/_/g, ' ')}
          </span>
        </div>

        <div className="px-4 py-3 space-y-2">
          <p className="text-xs text-gray-500">
            {STATUS_DESC[h.status] ?? '—'}
          </p>
                    {/* agent contact */}
          {(h.agentName || h.agent_name) && (
            <div className="bg-blue-50 rounded-xl p-2.5">
              <p className="text-xs font-bold text-blue-800 mb-1">
                🧑‍🌾 Your Agent
              </p>

              <p className="text-sm font-bold text-blue-900">
                {h.agentName || h.agent_name}
              </p>

              {(h.assignedAgent?.phoneNumber || h.agentPhone) && (
                <div className="flex gap-2 mt-1.5">
                  <a
                    href={`tel:${h.assignedAgent?.phoneNumber || h.agentPhone}`}
                    className="flex-1 bg-blue-600 text-white text-xs font-bold py-1.5 rounded-lg text-center"
                  >
                    📞 Call Agent
                  </a>

                  <a
                    href={`https://wa.me/254${(
                      h.assignedAgent?.phoneNumber ||
                      h.agentPhone ||
                      ''
                    ).slice(-9)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-500 text-white text-xs font-bold py-1.5 rounded-lg text-center"
                  >
                    💬 WhatsApp
                  </a>
                </div>
              )}
            </div>
          )}

          {/* FIXED: Edit scheduled/confirmed harvest */}
          {['scheduled', 'confirmed'].includes(h.status) && (
            <button
              onClick={() => navigate(`/farmer/harvest/${h.id}/edit`)}
              className="w-full bg-yellow-500 text-white text-xs font-bold py-2.5 rounded-xl"
            >
              ✏️ Edit Harvest
            </button>
          )}

          {/* weight comparison */}
          {(h.estimatedWeightKg ||
            h.actualWeightKg ||
            h.estimated_weight_kg ||
            h.actual_weight_kg) && (
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                {
                  label: 'Your Estimate',
                  value:
                    h.estimatedWeightKg ?? h.estimated_weight_kg,
                  color: 'text-blue-600',
                },
                {
                  label: 'Actual',
                  value: h.actualWeightKg ?? h.actual_weight_kg,
                  color: 'text-gray-900',
                },
                {
                  label: 'Variance',
                  value:
                    h.weightVarianceKg ?? h.weight_variance_kg,
                  color:
                    num(
                      h.weightVarianceKg ??
                        h.weight_variance_kg
                    ) >= 0
                      ? 'text-green-600'
                      : 'text-red-500',
                },
              ].map((col) => {
                const raw = num(col.value)

                const display =
                  col.label === 'Variance'
                    ? col.value != null
                      ? `${raw >= 0 ? '+' : ''}${raw.toFixed(1)} kg`
                      : '—'
                    : col.value != null
                    ? `${raw} kg`
                    : '—'

                return (
                  <div
                    key={col.label}
                    className="bg-gray-50 rounded-xl p-2"
                  >
                    <p className="text-xs text-gray-400">
                      {col.label}
                    </p>

                    <p
                      className={`font-bold text-sm ${col.color}`}
                    >
                      {display}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* progress bar */}
          <div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
              <div
                className={`h-2 rounded-full ${
                  PROGRESS_C[h.status] ?? 'bg-gray-300'
                } ${PROGRESS_W[h.status] ?? 'w-0'}`}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-400">
              <span>Scheduled</span>

              <span>
                📅{' '}
                {new Date(
                  h.harvestDate || h.harvest_date
                ).toLocaleDateString('en-KE')}
              </span>

              {totalVal > 0 && (
                <span className="font-black text-green-600">
                  KES {totalVal.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* grading items */}
          {!compact && (h.items ?? []).length > 0 && (
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs font-bold text-green-800 mb-1">
                Payment Breakdown
              </p>

              {(h.items ?? []).map((item: any) => (
                <div
                  key={item.id}
                  className="flex justify-between text-xs text-green-700 mb-0.5"
                >
                  <span>
                    {item.miraaGrade ?? item.miraa_grade}:{' '}
                    {num(item.weightKg ?? item.weight_kg)}kg @
                    KES{' '}
                    {num(
                      item.pricePerKg ?? item.price_per_kg
                    ).toLocaleString()}
                  </span>

                  <span className="font-bold">
                    KES{' '}
                    {num(
                      item.totalValue ?? item.total_value
                    ).toLocaleString()}
                  </span>
                </div>
              ))}

              <div className="border-t border-green-200 mt-1.5 pt-1.5 flex justify-between font-black text-green-800 text-sm">
                <span>Total</span>

                <span>KES {totalVal.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* invoice button */}
          {h.status === 'paid' && (
            <button
              onClick={() =>
                navigate(`/farmer/harvest/${h.id}/invoice`)
              }
              className="w-full bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl"
            >
              📄 View / Download Invoice
            </button>
          )}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-green-600 px-5 pt-12 pb-28 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full translate-x-16 -translate-y-16" />

        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white opacity-5 rounded-full -translate-x-10 translate-y-10" />

        {/* top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-green-700 text-sm font-black">
                IG
              </span>
            </div>

            <div>
              <p className="text-green-200 text-xs">
                {greeting}
              </p>

              <h1 className="text-white text-xl font-black leading-tight">
                {(memberInfo?.fullName ??
                  member?.fullName ??
                  ''
                ).split(' ')[0]}{' '}
                👋
              </h1>
            </div>
          </div>

          {/* right icons */}
          <div className="flex items-center gap-2">
            {/* refresh */}
            <button
              onClick={() => loadDashboard(false)}
              disabled={refreshing}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"
            >
              {refreshing ? (
                <Spinner size={4} />
              ) : (
                <span className="text-sm">🔄</span>
              )}
            </button>

            {/* notifications */}
            <button
              onClick={() =>
                navigate('/farmer/notifications')
              }
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center relative"
            >
              <span className="text-sm">🔔</span>

              {announcements.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-black">
                  {announcements.length}
                </span>
              )}
            </button>

            {/* profile */}
            <button
              onClick={() => navigate('/farmer/profile')}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center overflow-hidden"
            >
              {memberInfo?.profilePhotoUrl ? (
                <img
                  src={memberInfo.profilePhotoUrl}
                  alt=""
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    ;(
                      e.target as HTMLImageElement
                    ).style.display = 'none'
                  }}
                />
              ) : (
                <span className="text-white text-sm font-black">
                  {(
                    memberInfo?.fullName ??
                    member?.fullName ??
                    '?'
                  ).charAt(0)}
                </span>
              )}
            </button>

            {/* logout */}
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="w-9 h-9 bg-white bg-opacity-20 rounded-xl flex items-center justify-center"
            >
              <span className="text-sm">🚪</span>
            </button>
          </div>
        </div>

        {/* pills */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="bg-white bg-opacity-20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
            🌿 {memberInfo?.memberNumber ?? member?.memberNumber}
          </span>

          {(memberInfo?.village ?? member?.village) && (
            <span className="bg-white bg-opacity-20 text-white text-xs px-3 py-1.5 rounded-full font-medium">
              📍 {memberInfo?.village ?? member?.village}
            </span>
          )}

          {roles.includes('agent') && (
            <button
              onClick={() => {
                setActiveRole('agent')
                navigate('/agent')
              }}
              className="bg-blue-500 bg-opacity-90 text-white text-xs px-3 py-1.5 rounded-full font-bold active:opacity-80"
            >
              🧑‍🌾 Agent View
            </button>
          )}
        </div>

        {/* balance card */}
        <div className="bg-white bg-opacity-15 rounded-3xl p-5 border border-white border-opacity-20">
          <p className="text-green-100 text-xs font-medium mb-1">
            Total Savings Balance
          </p>

          <p className="text-white text-4xl font-black mb-1">
            KES {totalSavings.toLocaleString()}
          </p>

          {num(shareCapital.totalValue) > 0 && (
            <p className="text-green-200 text-xs mb-3">
              📊 Share Capital: KES{' '}
              {num(shareCapital.totalValue).toLocaleString()}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: 'Accounts',
                value: savingsAccounts.length,
                tab: 'savings',
              },
              {
                label: 'Loans',
                value: allLoans.length,
                tab: 'loans',
              },
              {
                label: 'Harvests',
                value: recentHarvests.length,
                tab: 'harvests',
              },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => setActiveTab(s.tab as any)}
                className="bg-white bg-opacity-10 active:bg-opacity-20 rounded-xl p-2.5 text-center"
              >
                <p className="text-white text-lg font-black">
                  {s.value}
                </p>

                <p className="text-green-200 text-xs">
                  {s.label}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
            {/* ── CONTENT AREA ─────────────────────────────────────────────────────── */}
      <div className="px-4 -mt-16 space-y-4">

        {/* announcement banner */}
        {announcements.length > 0 && (
          <button
            onClick={() => navigate('/farmer/notifications')}
            className={`w-full rounded-2xl p-4 flex items-center gap-3 text-left active:opacity-90 ${
              announcements[0]?.type === 'urgent'
                ? 'bg-red-50 border border-red-200'
                : announcements[0]?.type === 'warning'
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <span className="text-2xl flex-shrink-0">
              {announcements[0]?.type === 'urgent'
                ? '🚨'
                : announcements[0]?.type === 'warning'
                ? '⚠️'
                : 'ℹ️'}
            </span>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {announcements[0]?.title}
              </p>

              <p className="text-gray-600 text-xs truncate">
                {announcements[0]?.message}
              </p>
            </div>

            <span className="text-gray-400 font-bold flex-shrink-0">
              →
            </span>
          </button>
        )}

        {/* harvest limit warning */}
        {todayLimit && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">⚖️</span>

            <div>
              <p className="font-bold text-orange-900 text-sm">
                Today's Harvest Limit
              </p>

              <p className="text-orange-700 text-xs">
                {todayLimit.maxWeightKg
                  ? `Max: ${todayLimit.maxWeightKg} kg`
                  : ''}

                {todayLimit.maxBundles
                  ? ` / ${todayLimit.maxBundles} bundles`
                  : ''}

                {todayLimit.notes
                  ? ` — ${todayLimit.notes}`
                  : ''}
              </p>
            </div>
          </div>
        )}

        {/* quick actions */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </p>

          <div className="grid grid-cols-4 gap-3">
            <QuickBtn
              emoji="📅"
              label="Schedule"
              color="bg-green-50 border-green-200"
              onClick={() => navigate('/farmer/harvest/new')}
            />

            <QuickBtn
              emoji="🌿"
              label="Harvests"
              color="bg-teal-50 border-teal-200"
              onClick={() => setActiveTab('harvests')}
            />

            <QuickBtn
              emoji="🌱"
              label="AgroVet"
              color="bg-emerald-50 border-emerald-200"
              onClick={() => navigate('/farmer/agrovet')}
            />

            <QuickBtn
              emoji="💰"
              label="Loans"
              color="bg-purple-50 border-purple-200"
              onClick={() => setActiveTab('loans')}
            />

            <QuickBtn
              emoji="📊"
              label="Analytics"
              color="bg-teal-50 border-teal-200"
              onClick={() => navigate('/farmer/analytics')}
            />
          </div>
        </div>

        {/* ── MARKET PRICES ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-black text-gray-900">
                Today's Miraa Prices
              </p>

              <p className="text-xs text-gray-400">
                Set by Igembe SACCO
              </p>
            </div>

            <div className="bg-green-100 rounded-xl px-3 py-1.5">
              <span className="text-sm font-bold text-green-700">
                🌿 Live
              </span>
            </div>
          </div>

          {prices.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <p className="text-gray-500 text-sm">
                Prices not set today
              </p>

              <a
                href="tel:+254757630995"
                className="inline-block mt-2 bg-green-600 text-white text-xs px-4 py-2 rounded-xl font-bold"
              >
                📞 Call Office
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {prices.map((p: any) => {
                const grade =
                  p.miraaGrade ?? p.miraa_grade ?? ''

                const gradients: Record<string, string> = {
                  'Grade 1': 'from-green-700 to-green-500',
                  'Grade 2': 'from-teal-700 to-teal-500',
                  Gomba: 'from-orange-600 to-orange-400',
                }

                return (
                  <div
                    key={p.id}
                    className={`bg-gradient-to-br ${
                      gradients[grade] ??
                      'from-gray-600 to-gray-500'
                    } rounded-2xl p-4 text-white`}
                  >
                    <p className="text-xs font-bold opacity-80 mb-1">
                      {grade}
                    </p>

                    <p className="text-2xl font-black">
                      {num(
                        p.buyingPrice ?? p.buying_price
                      ).toLocaleString()}
                    </p>

                    <p className="text-xs opacity-70 mt-1">
                      KES/kg
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* HOME TAB */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <>
            {/* M-Pesa quick pay */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <p className="font-black text-gray-900 mb-3">
                📱 M-Pesa Payments
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() =>
                    navigate('/farmer/mpesa/deposit')
                  }
                  className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 active:bg-green-100"
                >
                  <span className="text-2xl">📥</span>

                  <div className="text-left">
                    <p className="font-bold text-green-900 text-sm">
                      Deposit
                    </p>

                    <p className="text-green-600 text-xs">
                      Add to savings
                    </p>
                  </div>
                </button>

                <button
                  onClick={() =>
                    navigate('/farmer/mpesa/withdraw')
                  }
                  className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center gap-3 active:bg-blue-100"
                >
                  <span className="text-2xl">💸</span>

                  <div className="text-left">
                    <p className="font-bold text-blue-900 text-sm">
                      Withdraw
                    </p>

                    <p className="text-blue-600 text-xs">
                      To M-Pesa
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* share capital */}
            {num(shareCapital.totalValue) > 0 && (
              <div className="bg-white rounded-3xl shadow-sm p-5">
                <p className="font-black text-gray-900 mb-3">
                  📊 Share Capital
                </p>

                <div className="bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-2xl p-4 text-white">
                  <p className="text-indigo-200 text-xs mb-1">
                    Total Share Capital Value
                  </p>

                  <p className="text-3xl font-black">
                    KES{' '}
                    {num(
                      shareCapital.totalValue
                    ).toLocaleString()}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-white bg-opacity-15 rounded-xl p-2.5 text-center">
                      <p className="text-indigo-200 text-xs">
                        Units
                      </p>

                      <p className="text-xl font-black">
                        {num(shareCapital.units) ||
                          Math.floor(
                            num(shareCapital.balance) /
                              Math.max(
                                1,
                                num(
                                  shareCapital.valuePerUnit
                                )
                              )
                          )}
                      </p>
                    </div>

                    <div className="bg-white bg-opacity-15 rounded-xl p-2.5 text-center">
                      <p className="text-indigo-200 text-xs">
                        Per Unit
                      </p>

                      <p className="text-xl font-black">
                        KES{' '}
                        {num(shareCapital.valuePerUnit)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* loan alert */}
            {allLoans.length > 0 && (
              <button
                onClick={() => setActiveTab('loans')}
                className="w-full bg-orange-50 border border-orange-200 rounded-3xl p-4 flex items-center gap-4 text-left active:bg-orange-100"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>

                <div className="flex-1">
                  <p className="font-bold text-orange-900 text-sm">
                    Loan Status Update
                  </p>

                  <p className="text-xs text-orange-700 mt-0.5">
                    {allLoans[0]?.status
                      ?.replace(/_/g, ' ')
                      ?.toUpperCase()}
                  </p>
                </div>

                <span className="text-orange-400 font-bold">
                  →
                </span>
              </button>
            )}

            {/* recent harvests preview */}
            <div className="bg-white rounded-3xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-black text-gray-900">
                    Recent Harvests
                  </p>

                  <p className="text-xs text-gray-400">
                    Track your miraa pickups
                  </p>
                </div>

                <button
                  onClick={() =>
                    navigate('/farmer/harvest/new')
                  }
                  className="bg-green-600 text-white text-xs px-3 py-2 rounded-xl font-bold"
                >
                  + Schedule
                </button>
              </div>

              {recentHarvests.length === 0 ? (
                <div className="bg-green-50 rounded-2xl p-6 text-center">
                  <p className="text-4xl mb-3">🌿</p>

                  <p className="font-bold text-gray-700 text-sm">
                    No harvests yet
                  </p>

                  <button
                    onClick={() =>
                      navigate('/farmer/harvest/new')
                    }
                    className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                  >
                    Schedule First Harvest
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentHarvests
                    .slice(0, 3)
                    .map((h: any) => (
                      <HarvestCard
                        key={h.id}
                        h={h}
                        compact
                      />
                    ))}

                  {recentHarvests.length > 3 && (
                    <button
                      onClick={() =>
                        setActiveTab('harvests')
                      }
                      className="w-full text-green-600 text-sm font-bold py-2 border border-green-200 rounded-xl"
                    >
                      View all {recentHarvests.length}{' '}
                      harvests →
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
                {/* ════════════════════════════════════════════════════════════════════ */}
        {/* SAVINGS TAB */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'savings' && (
          <div className="space-y-4">

            {/* SAVINGS ACCOUNTS — clearly labelled */}
            {savingsAccounts.length > 0 ? (
              savingsAccounts.map((acc: any) => (
                <div
                  key={acc.id}
                  className="bg-gradient-to-br from-green-700 to-green-500 rounded-3xl p-5 text-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-green-100 text-xs">
                        💵 Savings Account
                      </p>

                      <p className="text-white text-xs font-medium">
                        {acc.accountNumber}
                      </p>
                    </div>

                    <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-1 rounded-lg font-bold">
                      Active ✓
                    </span>
                  </div>

                  <p className="text-4xl font-black">
                    KES {Number(acc.balance).toLocaleString()}
                  </p>

                  <p className="text-green-200 text-xs mt-1">
                    Withdrawable Balance
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      onClick={() =>
                        navigate('/farmer/mpesa/deposit')
                      }
                      className="bg-white bg-opacity-20 text-white text-sm font-bold py-2 rounded-xl"
                    >
                      📥 Deposit
                    </button>

                    <button
                      onClick={() =>
                        navigate('/farmer/mpesa/withdraw')
                      }
                      className="bg-white bg-opacity-20 text-white text-sm font-bold py-2 rounded-xl"
                    >
                      💸 Withdraw
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl p-6 text-center">
                <p className="text-gray-500">
                  No savings account
                </p>
              </div>
            )}

            {/* SHARE CAPITAL — separate card */}
            {shareAccounts.length > 0 &&
              shareAccounts.map((acc: any) => (
                <div
                  key={acc.id}
                  className="bg-gradient-to-br from-indigo-700 to-indigo-500 rounded-3xl p-5 text-white"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-indigo-100 text-xs">
                        📊 Share Capital Account
                      </p>

                      <p className="text-white text-xs font-medium">
                        {acc.accountNumber}
                      </p>
                    </div>

                    <span className="bg-red-500 bg-opacity-80 text-white text-xs px-2 py-1 rounded-lg font-bold">
                      Non-withdrawable
                    </span>
                  </div>

                  <p className="text-4xl font-black">
                    KES {Number(acc.balance).toLocaleString()}
                  </p>

                  <p className="text-indigo-200 text-xs mt-1">
                    Your ownership shares in Igembe SACCO
                  </p>

                  <div className="mt-3 bg-white bg-opacity-10 rounded-xl p-3">
                    <p className="text-xs text-indigo-100">
                      Share capital represents your stake in the
                      SACCO. It grows as you contribute and earns
                      dividends annually.
                    </p>
                  </div>
                </div>
              ))}

            {/* Harvest Account */}
            {(Number(data?.member?.harvestAccountBalance) > 0 ||
              data?.member?.harvestAccountNumber) && (
              <div className="bg-gradient-to-br from-teal-700 to-teal-500 rounded-3xl p-5 text-white">
                <p className="text-teal-100 text-xs">
                  🌿 Harvest Payment Account
                </p>

                <p className="text-xs text-teal-200">
                  {data?.member?.harvestAccountNumber}
                </p>

                <p className="text-3xl font-black mt-2">
                  KES{' '}
                  {Number(
                    data?.member?.harvestAccountBalance || 0
                  ).toLocaleString()}
                </p>

                <p className="text-teal-200 text-xs mt-1">
                  Earnings from miraa sales
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* LOANS TAB */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {allLoans.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <p className="text-5xl mb-3">💰</p>

                <p className="font-bold text-gray-900">
                  No Active Loans
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  Visit the SACCO office to apply.
                </p>
              </div>
            ) : (
              allLoans.map((loan: any) => {
                const STATUS_COLORS_LOAN: Record<
                  string,
                  string
                > = {
                  pending:
                    'bg-yellow-100 text-yellow-700',
                  approved:
                    'bg-blue-100 text-blue-700',
                  disbursed:
                    'bg-purple-100 text-purple-700',
                  repaying:
                    'bg-green-100 text-green-700',
                  completed:
                    'bg-gray-100 text-gray-700',
                  rejected:
                    'bg-red-100 text-red-700',
                }

                const paid = Number(
                  loan.amountPaid || 0
                )

                const total = Number(
                  loan.totalPayable ||
                    loan.principalAmount ||
                    1
                )

                const pct = Math.min(
                  100,
                  Math.round((paid / total) * 100)
                )

                return (
                  <div
                    key={loan.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                      <span className="font-black text-gray-900">
                        {loan.loanNumber}
                      </span>

                      <span
                        className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${
                          STATUS_COLORS_LOAN[
                            loan.status
                          ] ||
                          'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {loan.status}
                      </span>
                    </div>

                    <div className="p-4">
                      {/* Status message */}
                      <div
                        className={`rounded-xl p-3 mb-3 text-sm font-medium ${
                          loan.status === 'approved'
                            ? 'bg-blue-50 text-blue-700'
                            : loan.status ===
                                'disbursed' ||
                              loan.status ===
                                'repaying'
                            ? 'bg-green-50 text-green-700'
                            : loan.status ===
                              'rejected'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-yellow-50 text-yellow-700'
                        }`}
                      >
                        {loan.status === 'pending' &&
                          '⏳ Under review by SACCO. You will be notified when approved.'}

                        {loan.status === 'approved' &&
                          '✅ Approved! Disbursement is being processed.'}

                        {loan.status === 'disbursed' &&
                          '💸 Disbursed to your M-Pesa. Start repaying monthly.'}

                        {loan.status === 'repaying' &&
                          '📈 Active — keep up with monthly payments!'}

                        {loan.status === 'rejected' &&
                          '❌ Not approved this time. Visit office for details.'}

                        {loan.status === 'completed' &&
                          '🎉 Fully paid! You can apply for another loan.'}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {[
                          {
                            label: 'Principal',
                            value: `KES ${Number(
                              loan.principalAmount
                            ).toLocaleString()}`,
                          },
                          {
                            label: 'Balance',
                            value: `KES ${Number(
                              loan.balanceOutstanding
                            ).toLocaleString()}`,
                          },
                          {
                            label: 'Monthly',
                            value: `KES ${Number(
                              loan.monthlyInstallment
                            ).toLocaleString()}`,
                          },
                          {
                            label: 'Amount Paid',
                            value: `KES ${paid.toLocaleString()}`,
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="bg-gray-50 rounded-xl p-3"
                          >
                            <p className="text-xs text-gray-500">
                              {item.label}
                            </p>

                            <p className="font-black text-sm">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {pct > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>
                              Repayment Progress
                            </span>

                            <span className="font-bold text-green-600">
                              {pct}%
                            </span>
                          </div>

                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                              className="bg-green-500 h-3 rounded-full"
                              style={{
                                width: `${pct}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {loan.dueDate && (
                        <p className="text-xs text-orange-600 font-medium mb-3">
                          📅 Due:{' '}
                          {new Date(
                            loan.dueDate
                          ).toLocaleDateString('en-KE')}
                        </p>
                      )}

                      {['disbursed', 'repaying'].includes(
                        loan.status
                      ) && (
                        <button
                          onClick={() =>
                            navigate('/farmer/mpesa/repay')
                          }
                          className="w-full bg-green-600 text-white text-sm font-bold py-3 rounded-xl"
                        >
                          📱 Repay via M-Pesa
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ─────────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 shadow-lg z-20">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          <NavBtn
            emoji="🏠"
            label="Home"
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />

          <NavBtn
            emoji="🌿"
            label="Harvests"
            active={activeTab === 'harvests'}
            onClick={() => setActiveTab('harvests')}
          />

          {/* floating centre button */}
          <div className="flex flex-col items-center -mt-8">
            <button
              onClick={() =>
                navigate('/farmer/harvest/new')
              }
              className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white active:bg-green-700"
            >
              <span className="text-white text-3xl font-black">
                +
              </span>
            </button>

            <span className="text-xs text-gray-400 mt-1">
              Schedule
            </span>
          </div>

          <NavBtn
            emoji="💵"
            label="Savings"
            active={activeTab === 'savings'}
            onClick={() => setActiveTab('savings')}
          />

          <NavBtn
            emoji="👤"
            label="Profile"
            active={false}
            onClick={() =>
              navigate('/farmer/profile')
            }
          />
        </div>
      </div>
    </div>
  )
}