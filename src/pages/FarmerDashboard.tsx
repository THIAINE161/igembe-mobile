import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import LanguageSwitcher from '../components/LanguageSwitcher'
import NotificationBell from '../components/NotificationBell'
import SaccoLogo from '../components/SaccoLogo'
import HarvestStepper from '../components/HarvestStepper'
import { useT } from '../lib/useT'
import api from '../lib/api'

type Tab = 'home' | 'harvests' | 'savings' | 'loans' | 'profile'

const STATUS_COLORS: Record<string, string> = {
  scheduled:          'bg-yellow-100 text-yellow-800',
  confirmed:          'bg-blue-100 text-blue-800',
  harvesting:         'bg-lime-100 text-lime-800',
  picked_up:          'bg-purple-100 text-purple-800',
  delivered_to_sacco: 'bg-orange-100 text-orange-800',
  graded:             'bg-teal-100 text-teal-800',
  paid:               'bg-green-100 text-green-800'
}

function Spinner({ size = 6, cls = 'text-green-600' }: { size?: number; cls?: string }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} ${cls}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// Simple bar chart component
function MiniBar({ value, max, color = '#16a34a', label = '' }: { value: number; max: number; color?: string; label?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>}
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-10 text-right">{value > 0 ? (value >= 1000 ? `${(value/1000).toFixed(1)}t` : `${value}kg`) : '0'}</span>
    </div>
  )
}

export default function FarmerDashboard() {
  const navigate  = useNavigate()
  const { member, logout, notifications } = useMobileStore()
  const t = useT()

  const [tab, setTab]           = useState<Tab>('home')
  const [data, setData]         = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Freshness indicators: a brief green flash on the balance card plus a
  // pulse on the header "Live" dot after any silent (non-initial) refresh.
  // `offline` only flips true on a real network error (no response reached
  // the server at all) — a reachable server returning an error status is
  // not "offline", so silent refreshes never show it for that case.
  const [flash, setFlash] = useState(false)
  const [offline, setOffline] = useState(false)

  // Pull-to-refresh on the home tab — only arms when the page is already
  // scrolled to the top, so it never fights normal scrolling further down.
  const touchStartY = useRef(0)
  const [pullY, setPullY] = useState(0)
  const [ptrActive, setPtrActive] = useState(false)
  const PULL_THRESHOLD = 64

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = window.scrollY === 0 ? e.touches[0].clientY : 0
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY.current || window.scrollY > 0) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setPullY(Math.min(delta, 90))
  }
  const handleTouchEnd = async () => {
    const shouldRefresh = pullY > PULL_THRESHOLD
    setPullY(0)
    touchStartY.current = 0
    if (shouldRefresh) {
      setPtrActive(true)
      await load(false)
      setPtrActive(false)
    }
  }

  useEffect(() => {
    if (!member?.id) { navigate('/login', { replace: true }); return }
    load()
    const interval = setInterval(() => load(false), 15_000)
    return () => clearInterval(interval)
  }, [member?.id])

  // React to live SSE-sourced events (pushed into the global `notifications`
  // store by useSSE at the app root) by refreshing right away instead of
  // waiting out the rest of the 15s poll interval. Announcements, harvest
  // status changes, and price updates all come back from the same single
  // dashboard endpoint, so any of them just means "refresh now".
  const lastHandledNotif = useRef<string | null>(null)
  useEffect(() => {
    const latest = notifications[0]
    if (!latest) return
    const key = latest.createdAt + latest.type
    if (lastHandledNotif.current === key) return
    lastHandledNotif.current = key
    if (['announcement', 'harvest_status_changed', 'market_price_update'].includes(latest.type)) {
      load(false)
    }
  }, [notifications])

  const load = useCallback(async (spinner = true) => {
    if (!member?.id) return
    if (spinner) setLoading(true)
    setError('')
    try {
      const r = await api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      setData(r.data?.data)
      setOffline(false)
      if (!spinner) {
        setFlash(true)
        setTimeout(() => setFlash(false), 1000)
      }
    } catch (e: any) {
      if (!e.response) setOffline(true)
      if (spinner) setError(e.response?.data?.error || 'Failed to load. Check your connection.')
    } finally {
      if (spinner) setLoading(false)
    }
  }, [member?.id])

  const markAnnouncementRead = useCallback(async (id: string) => {
    if (!member?.id) return
    try { await api.post(`/api/announcements/${id}/read`, { memberId: member.id }) } catch {}
  }, [member?.id])

  const markAllAnnouncementsRead = useCallback(async () => {
    if (!member?.id) return
    try { await api.post('/api/announcements/read-all', { memberId: member.id }) } catch {}
  }, [member?.id])

  if (!member) return null

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-green-600 px-5 pt-14 pb-24">
        <div className="flex justify-between items-start animate-pulse">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-white/20 rounded-full" />
            <div className="h-6 w-40 bg-white/30 rounded-lg" />
            <div className="h-3 w-32 bg-white/20 rounded-full" />
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 bg-white/15 rounded-xl" />
            <div className="w-10 h-10 bg-white/15 rounded-xl" />
            <div className="w-10 h-10 bg-white/15 rounded-xl" />
          </div>
        </div>
        <div className="mt-5 bg-white/15 rounded-3xl p-4 h-24 animate-pulse" />
      </div>
      <div className="px-4 -mt-12 mb-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-gray-200 rounded-2xl h-20 animate-pulse" />)}
        </div>
      </div>
      <div className="px-4 space-y-4 pb-24">
        {[1, 2, 3].map(i => <div key={i} className="bg-gray-200 rounded-2xl h-24 animate-pulse" />)}
      </div>
    </div>
  )

  if (error && !data) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 gap-4">
      <p className="text-5xl">⚠️</p>
      <p className="font-bold text-gray-900 text-center">{error}</p>
      <button onClick={() => load()} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold">{t('common.retry')}</button>
    </div>
  )

  const d               = data || {}
  const mem             = d.member || member
  const savAccounts: any[] = d.savingsAccounts || []
  const shareCapital    = d.shareCapital || {}
  const allLoans: any[] = d.activeLoans || []
  const harvests: any[] = d.recentHarvests || []
  const prices: any[]   = d.currentPrices || []
  const announcements: any[] = d.announcements || []
  const todayLimit      = d.todayLimit
  const eligibility     = d.loanEligibility || {}

  const savAcc     = savAccounts.find((a: any) => a.accountType === 'savings')
  const totalSav   = Number(savAcc?.balance || 0)
  // Lifetime harvest earnings history — separate from totalSav, which is the
  // withdrawable balance and shrinks as the farmer withdraws.
  const totalHarvestEarnings = Number(d.totalHarvestEarnings || 0)
  const shareBal   = Number(shareCapital.balance || 0)
  const activeLoan = allLoans.find((l: any) => ['disbursed','repaying'].includes(l.status))
  const latestH    = harvests[0]

  // Next upcoming pickup — earliest scheduled/confirmed harvest by date
  const upcomingHarvest = harvests
    .filter((h: any) => ['scheduled', 'confirmed'].includes(h.status) && h.harvestDate)
    .sort((a: any, b: any) => new Date(a.harvestDate).getTime() - new Date(b.harvestDate).getTime())[0]

  const daysUntilHarvest = (dateStr: string) => {
    const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.round((target.getTime() - today.getTime()) / 86400000)
  }

  // Analytics for harvest tab
  const paidHarvests     = harvests.filter((h: any) => h.status === 'paid')
  const totalKg          = paidHarvests.reduce((s: number, h: any) => s + Number(h.actualWeightKg || 0), 0)
  const totalEarnings    = harvests.reduce((s: number, h: any) => s + (h.items || []).reduce((x: number, i: any) => x + Number(i.totalValue || 0), 0), 0)
  const gradeBreakdown   = harvests.flatMap((h: any) => h.items || []).reduce((acc: any, i: any) => {
    const g = i.miraaGrade
    acc[g] = (acc[g] || 0) + Number(i.weightKg || 0)
    return acc
  }, {} as Record<string, number>)
  const maxGradeKg = Math.max(...Object.values(gradeBreakdown) as number[], 1)
  const bestGrade  = Object.entries(gradeBreakdown).sort((a, b) => (b[1] as number) - (a[1] as number))[0]

  // ── HOME ────────────────────────────────────────────────────────────────────
  const HomeTab = () => (
    <div>
      {/* Hero header */}
      <div className="bg-gradient-to-br from-green-800 via-green-700 to-green-600 px-5 pt-14 pb-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/5 rounded-full -translate-x-6 translate-y-6" />

        <div className="flex justify-between items-start relative">
          <div className="flex items-center gap-3 min-w-0">
            <SaccoLogo />
            <div className="min-w-0">
              <p className="text-green-300 text-xs font-medium tracking-wide">🌿 IGEMBE SACCO</p>
              <h1 className="text-white text-2xl font-black mt-0.5">
                Hello, {String(mem?.fullName || '').split(' ')[0]}!
              </h1>
              <p className="text-green-300 text-xs mt-1">{mem?.memberNumber} · {mem?.village}</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {offline ? (
              <div className="flex items-center gap-1.5 bg-orange-500/20 border border-orange-400/30 px-2.5 h-10 rounded-xl">
                <span className="text-orange-200 text-xs font-bold whitespace-nowrap">⚠ {t('farmerHome.offline')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-white/10 px-2.5 h-10 rounded-xl">
                <span className="relative flex h-2 w-2">
                  {flash && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                </span>
                <span className="text-green-200 text-[10px] font-bold tracking-wide whitespace-nowrap">{t('farmerHome.live')}</span>
              </div>
            )}
            <NotificationBell
              onViewHarvest={() => setTab('harvests')}
              announcements={announcements}
              onAnnouncementRead={markAnnouncementRead}
              onMarkAllAnnouncementsRead={markAllAnnouncementsRead}
            />
            <button onClick={() => setTab('profile')}
              className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <span className="text-white text-sm font-black">{String(mem?.fullName || 'U').charAt(0)}</span>
            </button>
          </div>
        </div>

        {/* Balance card — briefly tints green on each silent refresh so the
            farmer can see the data actually just updated. */}
        <div className={`mt-5 backdrop-blur-sm rounded-3xl p-4 border transition-colors duration-1000 ${
          flash ? 'bg-green-400/30 border-green-300/40' : 'bg-white/15 border-white/20'
        }`}>
          <p className="text-green-200 text-xs">{t('farmerHome.balanceLabel')}</p>
          <p className="text-white text-4xl font-black mt-0.5">KES {totalSav.toLocaleString()}</p>
          <div className="flex gap-4 mt-2">
            <div><p className="text-green-300 text-xs">{t('farmerHome.shareCapital')}</p><p className="text-white text-sm font-bold">KES {shareBal.toLocaleString()}</p></div>
            <div><p className="text-green-300 text-xs">{t('farmerHome.harvestEarnings')}</p><p className="text-white text-sm font-bold">KES {totalHarvestEarnings.toLocaleString()}</p></div>
          </div>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="px-4 -mt-12 mb-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { emoji: '📥', label: t('common.deposit'),         bg: 'bg-green-600',  action: () => navigate('/farmer/mpesa?type=deposit') },
            { emoji: '💸', label: t('common.withdraw'),        bg: 'bg-blue-600',   action: () => navigate('/farmer/mpesa?type=withdraw') },
            { emoji: '🌿', label: t('farmerHome.schedule'),    bg: 'bg-teal-600',   action: () => navigate('/farmer/harvest/schedule') },
            { emoji: '🛒', label: t('farmerHome.agrovet'),     bg: 'bg-orange-500', action: () => navigate('/farmer/agrovet') },
          ].map(item => (
            <button key={item.label} onClick={item.action}
              className={`${item.bg} rounded-2xl p-3.5 shadow-lg flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}>
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-xs font-bold text-white">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4 pb-24">
        {/* Harvest limit */}
        {todayLimit && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="font-bold text-amber-800 text-sm">{t('farmerHome.todayLimitTitle')}</p>
            <p className="text-amber-700 text-xs mt-1">
              {t('farmerHome.todayLimitMax', { max: todayLimit.maxWeightKg })}
              {todayLimit.notes && ` · ${todayLimit.notes}`}
            </p>
          </div>
        )}

        {/* Next harvest pickup countdown */}
        {upcomingHarvest && (() => {
          const days = daysUntilHarvest(upcomingHarvest.harvestDate)
          const countdownText =
            days === 0 ? t('farmerHome.countdownToday') :
            days === 1 ? t('farmerHome.countdownTomorrow') :
            days > 1  ? t('farmerHome.countdownDays', { days }) :
            t('farmerHome.countdownOverdue')
          return (
            <div className="bg-gradient-to-br from-teal-600 to-teal-500 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🌿</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm leading-snug">{countdownText}</p>
                  <p className="text-teal-100 text-xs mt-0.5">
                    {upcomingHarvest.harvestNumber} · {new Date(upcomingHarvest.harvestDate).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  {upcomingHarvest.agentName && (
                    <p className="text-teal-100 text-xs mt-0.5">{t('farmerHome.agentLabel', { name: upcomingHarvest.agentName })}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Latest harvest */}
        {latestH && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
              <span className="font-black text-gray-900 text-sm">{t('farmerHome.latestHarvest')}</span>
              <button onClick={() => setTab('harvests')} className="text-green-600 text-xs font-bold">{t('common.viewAll')} →</button>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-green-700">{latestH.harvestNumber}</p>
                  {latestH.harvestDate && (
                    <p className="text-gray-500 text-xs">📅 {new Date(latestH.harvestDate).toLocaleDateString('en-KE', { weekday:'short', day:'numeric', month:'short' })}</p>
                  )}
                  {latestH.farmLocation && <p className="text-gray-400 text-xs">📍 {latestH.farmLocation}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLORS[latestH.status] || 'bg-gray-100 text-gray-600'}`}>
                  {t(`status.${latestH.status}`)}
                </span>
              </div>
              {latestH.agentName && (
                <p className="text-blue-600 text-xs mt-2">{t('farmerHome.agentLabel', { name: latestH.agentName })}</p>
              )}
            </div>
          </div>
        )}

        {/* Miraa prices */}
        {prices.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <p className="font-black text-gray-900 mb-3">{t('farmerHome.todayPrices')}</p>
            <div className="grid grid-cols-3 gap-2">
              {prices.map((p: any) => (
                <div key={p.id} className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
                  <p className="text-xs text-gray-500 font-medium">{p.miraaGrade}</p>
                  <p className="font-black text-green-700 text-lg">KES {Number(p.buyingPrice).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">/kg buy</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active loan snippet */}
        {activeLoan && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="font-black text-gray-900">{t('farmerHome.activeLoan')}</p>
              <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${activeLoan.status === 'repaying' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{activeLoan.status}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500">{activeLoan.loanNumber}</span>
              <span className="font-black text-orange-600">KES {Number(activeLoan.balanceOutstanding).toLocaleString()} left</span>
            </div>
            <button onClick={() => navigate(`/farmer/mpesa?type=repay&loanId=${activeLoan.id}&loanNumber=${activeLoan.loanNumber}`)}
              className="w-full bg-green-600 text-white text-sm font-bold py-2.5 rounded-xl">
              {t('farmerHome.repayMpesa')}
            </button>
          </div>
        )}
      </div>

      {/* Floating quick-schedule button */}
      <button
        onClick={() => navigate('/farmer/harvest/schedule')}
        aria-label={t('farmerHarvests.scheduleNow')}
        className="fixed bottom-24 right-5 w-16 h-16 bg-green-600 rounded-full shadow-2xl flex items-center justify-center text-white active:scale-95 transition-transform z-40"
      >
        <span className="text-4xl font-light leading-none -mt-1">+</span>
      </button>
    </div>
  )

  // ── HARVESTS + ANALYTICS ────────────────────────────────────────────────────
  const HarvestsTab = () => {
    const [view, setView] = useState<'list' | 'analytics'>('list')
    return (
      <div className="pb-24">
        {/* Sub-tabs */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex gap-2 bg-gray-100 rounded-2xl p-1">
            <button onClick={() => setView('list')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${view === 'list' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}>
              {t('farmerHarvests.myHarvests')}
            </button>
            <button onClick={() => setView('analytics')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${view === 'analytics' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}>
              {t('farmerHarvests.myAnalytics')}
            </button>
          </div>
        </div>

        {view === 'list' ? (
          <div className="px-4 space-y-4">
            <div className="flex justify-between items-center">
              <p className="font-black text-gray-900">{t('farmerHarvests.recentHarvests', { count: harvests.length })}</p>
              <button onClick={() => navigate('/farmer/harvest/schedule')}
                className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
                {t('farmerHarvests.scheduleBtn')}
              </button>
            </div>

            {harvests.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <p className="text-5xl mb-4">🌿</p>
                <p className="font-bold text-gray-900">{t('farmerHarvests.noHarvests')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('farmerHarvests.scheduleFirst')}</p>
                <button onClick={() => navigate('/farmer/harvest/schedule')}
                  className="mt-4 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                  {t('farmerHarvests.scheduleNow')}
                </button>
              </div>
            ) : (
              harvests.map((h: any) => {
                const totalVal = (h.items || []).reduce((s: number, i: any) => s + Number(i.totalValue || 0), 0)
                const totalKgH = (h.items || []).reduce((s: number, i: any) => s + Number(i.weightKg || 0), 0)
                const paymentSentence = h.status === 'paid' && (h.items || []).length > 0
                  ? t('farmerHarvests.paymentBreakdown', {
                      kg: totalKgH,
                      breakdown: h.items.map((item: any) => `${item.miraaGrade} (${item.weightKg} kg = KES ${Number(item.totalValue).toLocaleString()})`).join(' + '),
                      total: totalVal.toLocaleString()
                    })
                  : null
                return (
                  <div key={h.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className={`flex justify-between items-center px-4 py-2.5 ${STATUS_COLORS[h.status] || 'bg-gray-100'}`}>
                      <span className="font-black text-sm">{h.harvestNumber}</span>
                      <span className="text-xs font-bold">{t(`status.${h.status}`)}</span>
                    </div>
                    <div className="px-4 pt-3">
                      <HarvestStepper status={h.status} />
                    </div>
                    <div className="p-4 pt-1 space-y-1.5">
                      {h.harvestDate && <p className="text-sm text-gray-700">📅 {new Date(h.harvestDate).toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long' })}</p>}
                      {h.farmLocation && <p className="text-sm text-gray-600">📍 {h.farmLocation}</p>}
                      {h.estimatedWeightKg > 0 && <p className="text-sm text-gray-600">⚖️ {t('farmerHarvests.estimated')} <strong>{h.estimatedWeightKg} kg</strong></p>}
                      {h.actualWeightKg > 0 && (
                        <p className="text-sm text-gray-600">✅ {t('farmerHarvests.actual')} <strong>{h.actualWeightKg} kg</strong>
                          {h.weightVarianceKg != null && (
                            <span className={`ml-1 text-xs font-bold ${Number(h.weightVarianceKg) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              ({Number(h.weightVarianceKg) >= 0 ? '+' : ''}{Number(h.weightVarianceKg).toFixed(1)} kg)
                            </span>
                          )}
                        </p>
                      )}
                      {h.agentName && (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-blue-600">{t('farmerHome.agentLabel', { name: h.agentName })}</p>
                          {h.assignedAgent?.phoneNumber && (
                            <a href={`tel:${h.assignedAgent.phoneNumber}`} className="text-xs text-blue-500 underline">{t('common.call')}</a>
                          )}
                        </div>
                      )}
                      {(h.items || []).length > 0 && (
                        <div className="bg-green-50 rounded-xl p-3 mt-2">
                          <p className="text-xs font-bold text-green-800 mb-1.5">{t('farmerHarvests.gradedMiraa')}</p>
                          {h.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs text-green-700 mb-0.5">
                              <span>{item.miraaGrade}: {item.weightKg} kg @ KES {Number(item.pricePerKg).toLocaleString()}/kg</span>
                              <span className="font-bold">KES {Number(item.totalValue).toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-sm font-black text-green-800 border-t border-green-200 mt-2 pt-2">
                            <span>{t('farmerHarvests.totalEarned')}</span>
                            <span>KES {totalVal.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                      {paymentSentence && (
                        <div className="bg-green-600 rounded-xl p-3 mt-2 text-white">
                          <p className="text-xs font-bold mb-1">{t('farmerHarvests.paymentBreakdownTitle')}</p>
                          <p className="text-xs leading-relaxed">{paymentSentence}</p>
                        </div>
                      )}
                      {['scheduled','confirmed'].includes(h.status) && (
                        <button onClick={() => navigate(`/farmer/harvest/${h.id}/edit`)}
                          className="w-full mt-2 border-2 border-gray-200 text-gray-600 text-sm font-bold py-2 rounded-xl">
                          {t('farmerHarvests.editHarvest')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        ) : (
          /* ── ANALYTICS ── */
          <div className="px-4 space-y-4">
            <p className="font-black text-gray-900 text-lg">{t('farmerHarvests.analyticsTitle')}</p>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t('farmerHarvests.totalHarvests'), value: String(harvests.length),      icon: '🌿', color: 'bg-green-50 border-green-100' },
                { label: t('farmerHarvests.paidHarvests'),  value: String(paidHarvests.length),  icon: '💰', color: 'bg-emerald-50 border-emerald-100' },
                { label: t('farmerHarvests.totalKg'),       value: `${totalKg.toFixed(0)} kg`,   icon: '⚖️', color: 'bg-blue-50 border-blue-100' },
                { label: t('farmerHarvests.totalEarnings'), value: `KES ${totalEarnings >= 1000 ? (totalEarnings/1000).toFixed(1)+'K' : totalEarnings.toLocaleString()}`, icon: '📈', color: 'bg-purple-50 border-purple-100' },
              ].map(card => (
                <div key={card.label} className={`${card.color} border rounded-2xl p-4`}>
                  <span className="text-2xl">{card.icon}</span>
                  <p className="font-black text-gray-900 text-lg mt-1">{card.value}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              ))}
            </div>

            {/* Grade breakdown */}
            {Object.keys(gradeBreakdown).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <p className="font-black text-gray-900 mb-3">{t('farmerHarvests.gradeBreakdown')}</p>
                {bestGrade && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                    <p className="text-xs text-green-700 font-medium">{t('farmerHarvests.bestGradeLabel')}</p>
                    <p className="font-black text-green-800 text-lg">{bestGrade[0]}</p>
                    <p className="text-xs text-green-600">{Number(bestGrade[1]).toFixed(1)} {t('farmerHarvests.kgTotal')}</p>
                  </div>
                )}
                <div className="space-y-2">
                  {Object.entries(gradeBreakdown).map(([grade, kg]) => (
                    <MiniBar key={grade} label={grade} value={Number(kg)} max={maxGradeKg}
                      color={grade === 'Grade 1' ? '#16a34a' : grade === 'Grade 2' ? '#2563eb' : '#d97706'} />
                  ))}
                </div>
              </div>
            )}

            {/* Harvest history table */}
            {paidHarvests.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-black text-gray-900">{t('farmerHarvests.harvestHistory')}</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {paidHarvests.map((h: any) => {
                    const val = (h.items || []).reduce((s: number, i: any) => s + Number(i.totalValue || 0), 0)
                    return (
                      <div key={h.id} className="flex justify-between items-center px-4 py-3">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{h.harvestNumber}</p>
                          <p className="text-xs text-gray-400">{h.harvestDate ? new Date(h.harvestDate).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{h.actualWeightKg || h.estimatedWeightKg || 0} kg</p>
                          {val > 0 && <p className="text-xs text-green-600 font-bold">KES {val.toLocaleString()}</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {harvests.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
                <p className="text-4xl mb-3">📊</p>
                <p className="font-bold text-gray-700">{t('farmerHarvests.noAnalytics')}</p>
                <p className="text-gray-400 text-sm mt-1">{t('farmerHarvests.noAnalyticsHint')}</p>
              </div>
            )}

            {/* Tips */}
            <div className="bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-2xl p-4">
              <p className="font-bold text-green-800 text-sm mb-2">{t('farmerHarvests.tipsTitle')}</p>
              <div className="space-y-1.5 text-xs text-green-700">
                <p>{t('farmerHarvests.tip1')}</p>
                <p>{t('farmerHarvests.tip2')}</p>
                <p>{t('farmerHarvests.tip3')}</p>
                <p>{t('farmerHarvests.tip4')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── SAVINGS ─────────────────────────────────────────────────────────────────
  const SavingsTab = () => (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <p className="font-black text-gray-900 text-xl">{t('farmerSavings.myAccounts')}</p>

      {savAccounts.filter((a: any) => a.accountType === 'savings').map((acc: any) => (
        <div key={acc.id} className="bg-gradient-to-br from-green-700 to-green-500 rounded-3xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start mb-1">
            <div>
              <p className="text-green-100 text-xs font-medium tracking-wide">{t('farmerSavings.savingsAccount')}</p>
              <p className="text-green-200 text-xs">{acc.accountNumber}</p>
            </div>
            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-bold">{t('farmerSavings.active')}</span>
          </div>
          <p className="text-5xl font-black mt-3">KES {Number(acc.balance).toLocaleString()}</p>
          <p className="text-green-200 text-xs mt-1">{t('farmerSavings.withdrawableBalance')}</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => navigate('/farmer/mpesa?type=deposit')}
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold py-3 rounded-2xl transition-colors active:scale-95">
              📥 {t('common.deposit')}
            </button>
            <button onClick={() => navigate('/farmer/mpesa?type=withdraw')}
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold py-3 rounded-2xl transition-colors active:scale-95">
              💸 {t('common.withdraw')}
            </button>
          </div>
        </div>
      ))}

      {savAccounts.filter((a: any) => a.accountType === 'shares').map((acc: any) => (
        <div key={acc.id} className="bg-gradient-to-br from-indigo-700 to-indigo-500 rounded-3xl p-5 text-white shadow-lg">
          <div className="flex justify-between items-start mb-1">
            <div>
              <p className="text-indigo-100 text-xs font-medium tracking-wide">{t('farmerSavings.shareCapitalTag')}</p>
              <p className="text-indigo-200 text-xs">{acc.accountNumber}</p>
            </div>
            <span className="bg-red-500/70 text-white text-xs px-2 py-0.5 rounded-full font-bold">{t('farmerSavings.nonWithdrawable')}</span>
          </div>
          <p className="text-5xl font-black mt-3">KES {Number(acc.balance).toLocaleString()}</p>
          <p className="text-indigo-200 text-xs mt-1">{t('farmerSavings.shareCapitalDesc')}</p>
          <div className="bg-white/10 rounded-2xl p-3 mt-4">
            <p className="text-xs text-indigo-100 leading-relaxed">
              {t('farmerSavings.shareCapitalLong')}
            </p>
          </div>
        </div>
      ))}

      {totalHarvestEarnings > 0 && (
        <div className="bg-gradient-to-br from-teal-700 to-teal-500 rounded-3xl p-5 text-white shadow-lg">
          <p className="text-teal-100 text-xs font-medium tracking-wide">{t('farmerSavings.harvestEarningsTag')}</p>
          <p className="text-4xl font-black mt-2">KES {totalHarvestEarnings.toLocaleString()}</p>
          <p className="text-teal-200 text-xs mt-1">{t('farmerSavings.harvestEarningsDesc')}</p>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
        <p className="font-black text-gray-900 text-sm">{t('farmerSavings.howToDepositTitle')}</p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs font-bold text-green-800 mb-1">{t('farmerSavings.option1Title')}</p>
          <p className="text-xs text-green-700 leading-relaxed">{t('farmerSavings.option1Text')}</p>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-700 mb-1.5">{t('farmerSavings.option2Title')}</p>
          <div className="space-y-1 text-xs text-gray-600">
            <p>{t('farmerSavings.paybillStep1')}</p>
            <p>{t('farmerSavings.paybillStep2', { number: '174379' })}</p>
            <p>{t('farmerSavings.paybillStep3', { number: mem?.memberNumber || '' })}</p>
            <p>{t('farmerSavings.paybillStep4')}</p>
          </div>
        </div>
      </div>
    </div>
  )

  // ── LOANS ────────────────────────────────────────────────────────────────────
  const LoansTab = () => (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex justify-between items-center gap-2">
        <p className="font-black text-gray-900 text-xl">{t('farmerLoans.myLoans')}</p>
        <div className="flex gap-2">
          <button onClick={() => navigate('/farmer/loan/calculator')}
            className="bg-white border border-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-xl">
            {t('farmerLoans.calculator')}
          </button>
          {eligibility.eligible && (
            <button onClick={() => navigate('/farmer/loan/apply')}
              className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl">
              {t('farmerLoans.apply')}
            </button>
          )}
        </div>
      </div>

      {/* Score card */}
      <div className={`rounded-2xl p-4 border ${eligibility.hasActiveLoan ? 'bg-orange-50 border-orange-200' : eligibility.loanScore > 60 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-bold text-gray-700">{t('farmerLoans.yourScore')}</p>
          <span className="font-black text-lg text-green-700">{eligibility.loanScore || 0}<span className="text-sm text-gray-400">/100</span></span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div className="h-2.5 rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
            style={{ width: `${Math.min(100, eligibility.loanScore || 0)}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{t('farmerLoans.maxEligible', { amount: `KES ${(eligibility.maxAmount || 50000).toLocaleString()}` })}</span>
          {eligibility.hasActiveLoan && <span className="text-orange-600 font-medium">{t('farmerLoans.hasActiveLoan')}</span>}
        </div>
      </div>

      {allLoans.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
          <p className="text-4xl mb-3">💰</p>
          <p className="font-bold text-gray-900">{t('farmerLoans.noLoans')}</p>
          <p className="text-gray-400 text-sm mt-1">{t('farmerLoans.applyToStart')}</p>
          <button onClick={() => navigate('/farmer/loan/apply')}
            className="mt-4 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
            {t('farmerLoans.applyForLoan')}
          </button>
        </div>
      ) : (
        allLoans.map((loan: any) => {
          const paid  = Number(loan.amountPaid || 0)
          const total = Number(loan.totalPayable || loan.principalAmount || 1)
          const pct   = Math.min(100, Math.round((paid / total) * 100))
          const bal   = Number(loan.balanceOutstanding || 0)
          return (
            <div key={loan.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-gray-50">
                <span className="font-black text-gray-900">{loan.loanNumber}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold capitalize ${
                  loan.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  ['disbursed','repaying'].includes(loan.status) ? 'bg-green-100 text-green-700' :
                  loan.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                  loan.status === 'rejected'  ? 'bg-red-100 text-red-700'  : 'bg-yellow-100 text-yellow-700'
                }`}>{loan.status}</span>
              </div>
              <div className="p-4">
                <div className={`text-xs font-medium rounded-xl px-3 py-2 mb-3 ${
                  loan.status === 'approved'  ? 'bg-blue-50 text-blue-700' :
                  ['disbursed','repaying'].includes(loan.status) ? 'bg-green-50 text-green-700' :
                  loan.status === 'completed' ? 'bg-gray-50 text-gray-600' :
                  loan.status === 'rejected'  ? 'bg-red-50 text-red-700'   : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {t(`loanStatus.${loan.status}`)}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: t('farmerLoans.principal'),  value: `KES ${Number(loan.principalAmount).toLocaleString()}` },
                    { label: t('farmerLoans.balance'),    value: `KES ${bal.toLocaleString()}` },
                    { label: t('farmerLoans.monthly'),    value: `KES ${Number(loan.monthlyInstallment).toLocaleString()}` },
                    { label: t('farmerLoans.totalPaid'),  value: `KES ${paid.toLocaleString()}` },
                  ].map(r => (
                    <div key={r.label} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400">{r.label}</p>
                      <p className="font-black text-sm text-gray-900">{r.value}</p>
                    </div>
                  ))}
                </div>

                {pct > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">{t('farmerLoans.repaymentProgress')}</span>
                      <span className="font-bold text-green-600">{pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div className="h-2.5 rounded-full bg-gradient-to-r from-green-500 to-green-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {loan.dueDate && (
                  <p className="text-xs text-orange-600 font-medium mb-3">
                    {t('farmerLoans.due', { date: new Date(loan.dueDate).toLocaleDateString('en-KE') })}
                  </p>
                )}

                {['disbursed','repaying'].includes(loan.status) && (
                  <button onClick={() => navigate(`/farmer/mpesa?type=repay&loanId=${loan.id}&loanNumber=${loan.loanNumber}`)}
                    className="w-full bg-green-600 text-white text-sm font-bold py-3 rounded-xl">
                    {t('farmerLoans.repayMpesa')}
                  </button>
                )}

                {loan.status === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-green-700 font-bold text-sm">{t('farmerLoans.fullyRepaid')}</p>
                    <button onClick={() => navigate('/farmer/loan/apply')}
                      className="mt-2 bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl">
                      {t('farmerLoans.applyNewLoan')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )

  // ── PROFILE ──────────────────────────────────────────────────────────────────
  const ProfileTab = () => (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Profile hero */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-4xl font-black">{String(mem?.fullName || 'U').charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-2xl font-black">{mem?.fullName}</h2>
            <p className="text-green-200 text-sm">{mem?.memberNumber}</p>
            <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${mem?.status === 'active' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
              {mem?.status === 'active' ? t('farmerProfile.activeMember') : mem?.status}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="font-black text-gray-900 mb-3">{t('farmerProfile.accountDetails')}</p>
        {[
          { label: t('farmerProfile.phone'),         value: mem?.phoneNumber },
          { label: t('farmerProfile.village'),       value: mem?.village },
          { label: t('farmerProfile.ward'),          value: mem?.ward },
          { label: t('farmerProfile.memberNo'),      value: mem?.memberNumber },
          { label: t('farmerProfile.loanScore'),     value: `${mem?.loanScore || 0}/100` },
          { label: t('farmerProfile.totalHarvests'), value: String(harvests.length) },
        ].map(r => (
          <div key={r.label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
            <span className="text-gray-500 text-sm">{r.label}</span>
            <span className="font-bold text-gray-900 text-sm">{r.value || '—'}</span>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <p className="font-black text-gray-900 mb-3">{t('farmerProfile.settings')}</p>
        <div className="flex items-center justify-between py-3 border-b border-gray-50">
          <span className="text-gray-700 text-sm">🌐 {t('common.changeLanguage')}</span>
          <LanguageSwitcher />
        </div>
        <button onClick={() => navigate('/forgot-pin')}
          className="w-full text-left flex items-center justify-between py-3 border-b border-gray-50 active:bg-gray-50 rounded-xl px-2">
          <span className="text-gray-700 text-sm">{t('farmerProfile.changePin')}</span>
          <span className="text-gray-400 text-lg">›</span>
        </button>
        <button onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="w-full bg-red-50 border border-red-200 text-red-600 font-bold py-3 rounded-2xl text-sm mt-3">
          🚪 {t('common.signOut')}
        </button>
      </div>

      {/* SACCO Office */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-2">
        <p className="font-black text-gray-900 mb-2">🏦 {t('common.saccoOffice')}</p>
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <span className="text-2xl">🕐</span>
          <div>
            <p className="font-bold text-sm text-gray-900">{t('common.officeHoursLabel')}</p>
            <p className="text-gray-500 text-xs">{t('common.officeHours')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <span className="text-2xl">📍</span>
          <div>
            <p className="font-bold text-sm text-gray-900">{t('common.locationLabel')}</p>
            <p className="text-gray-500 text-xs">Igembe South, Meru County</p>
          </div>
        </div>
        <a href="tel:0757630995" className="flex items-center gap-3 bg-green-50 rounded-xl p-3 active:bg-green-100">
          <span className="text-2xl">📞</span>
          <div>
            <p className="font-bold text-sm text-gray-900">{t('common.callSaccoOffice')}</p>
            <p className="text-green-600 text-xs">0757 630 995</p>
          </div>
        </a>
        <a href="https://wa.me/254757630995" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 bg-green-50 rounded-xl p-3 active:bg-green-100">
          <span className="text-2xl">💬</span>
          <div>
            <p className="font-bold text-sm text-gray-900">{t('common.whatsappSacco')}</p>
            <p className="text-green-600 text-xs">+254 757 630 995</p>
          </div>
        </a>
      </div>
    </div>
  )

  // ── BOTTOM NAV + RENDER ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-20">
        <div key={tab} className="tab-fade-in">
          {tab === 'home' && (
            <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
              {(pullY > 0 || ptrActive) && (
                <div className="flex items-center justify-center overflow-hidden transition-all duration-150"
                  style={{ height: ptrActive ? 50 : pullY }}>
                  {ptrActive
                    ? <Spinner size={5} />
                    : <span className="text-xs text-gray-400 font-bold">{pullY > PULL_THRESHOLD ? '↑ Release to refresh' : '↓ Pull to refresh'}</span>}
                </div>
              )}
              {/* Called, not rendered as <HomeTab />: HomeTab is redefined on
                  every render, so as a component it would remount (resetting
                  NotificationBell's open state) on each poll/flash/pull. */}
              {HomeTab()}
            </div>
          )}
          {tab === 'harvests' && <HarvestsTab />}
          {tab === 'savings'  && <SavingsTab />}
          {tab === 'loans'    && <LoansTab />}
          {tab === 'profile'  && <ProfileTab />}
        </div>
      </div>

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 shadow-xl">
        <div className="flex justify-around items-center px-2 py-2 max-w-lg mx-auto">
          {([
            { id: 'home',     emoji: '🏠', label: t('nav.home')     },
            { id: 'harvests', emoji: '🌿', label: t('nav.harvests') },
            { id: 'savings',  emoji: '💵', label: t('nav.savings')  },
            { id: 'loans',    emoji: '💰', label: t('nav.loans')    },
            { id: 'profile',  emoji: '👤', label: t('nav.profile') },
          ] as { id: Tab; emoji: string; label: string }[]).map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all min-w-[56px] ${tab === item.id ? 'text-green-600 bg-green-50' : 'text-gray-400'}`}>
              <span className={`text-xl transition-transform ${tab === item.id ? 'scale-110' : ''}`}>{item.emoji}</span>
              <span className={`text-[10px] font-bold ${tab === item.id ? 'text-green-600' : 'text-gray-400'}`}>{item.label}</span>
              {tab === item.id && <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}