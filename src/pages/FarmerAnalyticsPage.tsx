import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

const num = (v: any) => Number(v) || 0

export default function FarmerAnalyticsPage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()
  const [harvests, setHarvests] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!member?.id) { navigate('/login'); return }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [hRes, pRes] = await Promise.all([
        api.get(`/api/harvests?memberId=${member!.id}&limit=50`),
        api.get('/api/market-prices/latest')
      ])
      setHarvests(hRes.data.data || [])
      setPrices(pRes.data.data || [])
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (!member) return null

  const paidHarvests = harvests.filter(h => h.status === 'paid')
  const allItems = paidHarvests.flatMap(h => h.items || [])
  const totalWeight = harvests.reduce((s, h) => s + num(h.actualWeightKg || h.actual_weight_kg), 0)
  const totalValue = allItems.reduce((s, i) => s + num(i.totalValue), 0)
  const estimatedTotal = harvests.reduce((s, h) => s + num(h.estimatedWeightKg || h.estimated_weight_kg), 0)
  const avgVariance = paidHarvests.length > 0
    ? paidHarvests.reduce((s, h) => s + num(h.weightVarianceKg || h.weight_variance_kg), 0) / paidHarvests.length
    : 0
  const avgValuePerKg = totalWeight > 0 ? totalValue / totalWeight : 0
  const bestHarvest = paidHarvests.reduce((best, h) => {
    const val = (h.items || []).reduce((s: number, i: any) => s + num(i.totalValue), 0)
    return val > (best?.val || 0) ? { ...h, val } : best
  }, null as any)

  // Monthly chart data
  const monthlyData: Record<string, { weight: number; value: number; count: number }> = {}
  harvests.forEach(h => {
    if (!h.harvestDate && !h.harvest_date) return
    const d = new Date(h.harvestDate || h.harvest_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!monthlyData[key]) monthlyData[key] = { weight: 0, value: 0, count: 0 }
    monthlyData[key].weight += num(h.actualWeightKg || h.actual_weight_kg)
    monthlyData[key].count++
    const hVal = (h.items || []).reduce((s: number, i: any) => s + num(i.totalValue), 0)
    monthlyData[key].value += hVal
  })
  const months = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  const maxWeight = Math.max(...months.map(([, d]) => d.weight), 1)

  // Grade breakdown
  const gradeSummary: Record<string, { weight: number; value: number }> = {}
  allItems.forEach(i => {
    const g = i.miraaGrade || i.miraa_grade || 'Unknown'
    if (!gradeSummary[g]) gradeSummary[g] = { weight: 0, value: 0 }
    gradeSummary[g].weight += num(i.weightKg || i.weight_kg)
    gradeSummary[g].value += num(i.totalValue || i.total_value)
  })

  const GRADE_COLORS: Record<string, string> = {
    'Grade 1': '#16a34a', 'Grade 2': '#2563eb', 'Gomba': '#d97706'
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <svg className="animate-spin h-10 w-10 text-green-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <p className="text-gray-500">Loading your analytics...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <p className="text-4xl mb-4">⚠️</p>
      <p className="text-gray-700 font-bold mb-4">{error}</p>
      <button onClick={() => navigate('/farmer')} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold">← Back</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-green-900 via-green-700 to-teal-600 px-5 pt-12 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-32 h-32 bg-white rounded-full"
              style={{ left: `${i * 20}%`, top: `${(i % 2) * 50}%`, opacity: 0.1 }} />
          ))}
        </div>
        <button onClick={() => navigate('/farmer')} className="text-green-200 text-sm mb-4 relative z-10">← Back</button>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-white text-2xl font-black">My Harvest Analytics</h1>
              <p className="text-green-200 text-sm">{member.fullName} · {member.memberNumber}</p>
            </div>
          </div>

          {/* Key metric */}
          <div className="bg-white bg-opacity-15 rounded-3xl p-5 border border-white border-opacity-20">
            <p className="text-green-100 text-xs mb-1">Total Earnings from Miraa</p>
            <p className="text-white text-5xl font-black">KES {totalValue.toLocaleString()}</p>
            <p className="text-green-200 text-sm mt-2">
              From {paidHarvests.length} paid harvests · {totalWeight.toFixed(1)} kg total
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-20 space-y-4 relative z-10">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Harvests', value: harvests.length, icon: '🌿', sub: `${paidHarvests.length} paid` },
            { label: 'Total Weight', value: `${totalWeight.toFixed(1)} kg`, icon: '⚖️', sub: `Est: ${estimatedTotal.toFixed(1)} kg` },
            { label: 'Avg Variance', value: `${avgVariance >= 0 ? '+' : ''}${avgVariance.toFixed(1)} kg`, icon: avgVariance >= 0 ? '📈' : '📉', sub: avgVariance >= 0 ? 'Above estimate ✓' : 'Below estimate' },
            { label: 'Avg Price/kg', value: avgValuePerKg > 0 ? `KES ${avgValuePerKg.toFixed(0)}` : '—', icon: '💰', sub: 'Blended average' },
          ].map(card => (
            <div key={card.label} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{card.icon}</span>
                <span className="text-xs text-gray-400">{card.sub}</span>
              </div>
              <p className="text-xl font-black text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Monthly Chart */}
        {months.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-black text-gray-900">Monthly Harvest Weight</p>
                <p className="text-xs text-gray-400">Last 6 months</p>
              </div>
              <span className="text-2xl">📅</span>
            </div>
            <div className="flex items-end gap-2 h-28">
              {months.map(([month, d]) => {
                const pct = maxWeight > 0 ? (d.weight / maxWeight) * 100 : 0
                const [yr, mo] = month.split('-')
                const label = new Date(Number(yr), Number(mo) - 1).toLocaleDateString('en-KE', { month: 'short' })
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 font-bold">
                      {d.weight > 0 ? `${d.weight.toFixed(0)}` : ''}
                    </span>
                    <div className="w-full rounded-t-xl transition-all" style={{
                      height: `${Math.max(4, pct)}%`,
                      minHeight: 4,
                      background: `linear-gradient(to top, #16a34a, #4ade80)`,
                      opacity: pct > 0 ? 1 : 0.3
                    }} />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Grade Breakdown */}
        {Object.keys(gradeSummary).length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <p className="font-black text-gray-900">Grade Breakdown</p>
              <span className="text-2xl">🌿</span>
            </div>
            <div className="space-y-3">
              {Object.entries(gradeSummary).sort(([, a], [, b]) => b.value - a.value).map(([grade, data]) => {
                const pct = totalValue > 0 ? (data.value / totalValue) * 100 : 0
                const color = GRADE_COLORS[grade] || '#6b7280'
                return (
                  <div key={grade}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-900">{grade}</span>
                      <div className="text-right">
                        <span className="text-xs font-black" style={{ color }}>KES {data.value.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-2">{data.weight.toFixed(1)} kg</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                      <div className="h-3 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}% of total earnings</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Today's Prices */}
        {prices.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
            <p className="font-black text-gray-900 mb-3">📊 Current Market Prices</p>
            <div className="grid grid-cols-3 gap-3">
              {prices.map((p: any) => {
                const grade = p.miraaGrade || p.miraa_grade || ''
                const color = GRADE_COLORS[grade] || '#6b7280'
                return (
                  <div key={p.id} className="rounded-2xl p-3 text-white text-center"
                    style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                    <p className="text-xs font-bold opacity-80">{grade}</p>
                    <p className="text-xl font-black">{num(p.buyingPrice || p.buying_price).toLocaleString()}</p>
                    <p className="text-xs opacity-70">KES/kg</p>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              💡 At current prices, your {totalWeight.toFixed(1)} kg would be worth ~KES{' '}
              {prices.length > 0 ? Math.round(totalWeight * num(prices[0]?.buyingPrice || prices[0]?.buying_price)).toLocaleString() : '—'}
            </p>
          </div>
        )}

        {/* Best Harvest */}
        {bestHarvest && (
          <div className="bg-gradient-to-br from-green-700 to-green-600 rounded-3xl p-5 text-white">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🏆</span>
              <div>
                <p className="font-black text-lg">Your Best Harvest</p>
                <p className="text-green-200 text-xs">{bestHarvest.harvestNumber || bestHarvest.harvest_number}</p>
              </div>
            </div>
            <p className="text-4xl font-black">KES {bestHarvest.val.toLocaleString()}</p>
            <p className="text-green-200 text-sm mt-1">
              {bestHarvest.harvestDate ? new Date(bestHarvest.harvestDate).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            </p>
            <div className="mt-3 bg-white bg-opacity-15 rounded-2xl p-3">
              <p className="text-xs text-green-100">Keep it up! Consistent harvesting builds your SACCO profile and increases your loan eligibility. 💪</p>
            </div>
          </div>
        )}

        {/* SACCO Trust Score */}
        <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⭐</span>
            <div>
              <p className="font-black text-gray-900">SACCO Trust Score</p>
              <p className="text-xs text-gray-400">Based on your activity</p>
            </div>
          </div>
          {(() => {
            let score = 0
            if (harvests.length >= 1) score += 20
            if (harvests.length >= 5) score += 20
            if (paidHarvests.length >= 3) score += 20
            if (totalValue >= 10000) score += 20
            if (avgVariance >= -2) score += 20 // accurate estimations
            const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Building'
            const color = score >= 80 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : '#6b7280'
            return (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-black" style={{ color }}>{score}/100</span>
                  <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ backgroundColor: color + '20', color }}>{label}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-4 mb-4">
                  <div className="h-4 rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: color }} />
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'First harvest scheduled', done: harvests.length >= 1 },
                    { label: '5+ harvests completed', done: harvests.length >= 5 },
                    { label: '3+ paid harvests', done: paidHarvests.length >= 3 },
                    { label: 'KES 10,000+ total earnings', done: totalValue >= 10000 },
                    { label: 'Accurate weight estimates', done: avgVariance >= -2 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <span className={item.done ? 'text-green-500' : 'text-gray-300'}>
                        {item.done ? '✅' : '⭕'}
                      </span>
                      <span className={item.done ? 'text-gray-900' : 'text-gray-400'}>{item.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 bg-blue-50 rounded-2xl p-3">
                  <p className="text-xs font-bold text-blue-800 mb-1">💡 How to increase your score:</p>
                  <p className="text-xs text-blue-600">
                    Regular harvesting, accurate weight estimates, and consistent savings deposits build your trust score and unlock higher loan limits.
                  </p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* Harvest Tips */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-600 rounded-3xl p-5 text-white">
          <p className="font-black text-lg mb-4">💡 Tips to Maximise Your Earnings</p>
          <div className="space-y-3">
            {[
              { icon: '🌿', tip: 'Harvest Grade 1 in the morning when leaves are freshest — better price.' },
              { icon: '⚖️', tip: 'Keep accurate weight estimates. High variance affects your trust score.' },
              { icon: '📅', tip: 'Schedule harvests at least 1 day ahead to get the best agent.' },
              { icon: '💰', tip: 'Save at least 10% of each harvest payment to grow your SACCO balance.' },
              { icon: '🧑‍🌾', tip: 'Communicate with your agent in advance so they arrive prepared.' },
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-3 bg-white bg-opacity-10 rounded-2xl p-3">
                <span className="text-xl flex-shrink-0">{t.icon}</span>
                <p className="text-green-100 text-sm">{t.tip}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}