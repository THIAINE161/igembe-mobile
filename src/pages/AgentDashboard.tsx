import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

type AgentTab = 'active' | 'completed' | 'prices' | 'profile'

const STATUS_COLORS: Record<string, string> = {
  confirmed:          'bg-blue-100 text-blue-800',
  harvesting:         'bg-yellow-100 text-yellow-800',
  picked_up:          'bg-purple-100 text-purple-800',
  delivered_to_sacco: 'bg-orange-100 text-orange-800',
  graded:             'bg-teal-100 text-teal-800',
  paid:               'bg-green-100 text-green-800',
}
const STATUS_NEXT: Record<string, string> = {
  confirmed:  '🌿 Start Harvesting',
  harvesting: '⚖️ Record Quantity',
  picked_up:  '🌿 Grade Miraa',
}

function Spinner({ size = 5, cls = 'text-blue-600' }: { size?: number; cls?: string }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} ${cls}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ── Embedded map component (Uber/Bolt style) ────────────────────────────────
function EmbeddedMap({ harvest }: { harvest: any }) {
  const mapRef     = useRef<HTMLDivElement>(null)
  const mapInst    = useRef<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'no-location'>('loading')

  const farmLat  = Number(harvest.farmLatitude  || harvest.member?.latitude  || 0)
  const farmLng  = Number(harvest.farmLongitude || harvest.member?.longitude || 0)
  const hasFarmCoords = farmLat !== 0 && farmLng !== 0

  useEffect(() => {
    if (!mapRef.current) return
    let mounted = true

    const init = () => {
      if (!mounted || !mapRef.current) return
      const L = (window as any).L
      if (!L) { setTimeout(init, 500); return }

      // Remove old map
      if (mapInst.current) { try { mapInst.current.remove() } catch (_) {} mapInst.current = null }

      const defaultLat = hasFarmCoords ? farmLat : -0.3
      const defaultLng = hasFarmCoords ? farmLng : 37.65

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: false
      }).setView([defaultLat, defaultLng], hasFarmCoords ? 15 : 12)

      mapInst.current = map

      // Map tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)

      if (hasFarmCoords) {
        // Farm marker (green pin)
        const farmIcon = L.divIcon({
          html: `<div style="background:#16a34a;color:white;border-radius:50% 50% 50% 0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 12px rgba(0,0,0,0.3);transform:rotate(-45deg);border:3px solid white;">
                   <span style="transform:rotate(45deg)">🌿</span>
                 </div>`,
          className: '',
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        })
        const farmMarker = L.marker([farmLat, farmLng], { icon: farmIcon }).addTo(map)
        farmMarker.bindPopup(`
          <div style="font-family:sans-serif;min-width:160px;">
            <p style="font-weight:900;margin:0 0 4px 0;color:#166534">${harvest.member?.fullName || 'Farm'}</p>
            <p style="font-size:11px;color:#4b5563;margin:0">${harvest.farmLocation || harvest.member?.village || 'Farm location'}</p>
            ${harvest.estimatedWeightKg > 0 ? `<p style="font-size:11px;color:#4b5563;margin:4px 0 0 0">Est: ${harvest.estimatedWeightKg} kg</p>` : ''}
          </div>
        `, { maxWidth: 200 })

        // Try to get agent's GPS location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              if (!mounted || !mapInst.current) return
              const agLat = pos.coords.latitude
              const agLng = pos.coords.longitude

              // Agent marker (blue)
              const agentIcon = L.divIcon({
                html: `<div style="background:#2563eb;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 12px rgba(0,0,0,0.4);border:3px solid white;">📍</div>`,
                className: '',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              })
              L.marker([agLat, agLng], { icon: agentIcon }).addTo(map)
                .bindPopup('<b>📍 Your Location</b>')

              // Dashed route line
              L.polyline([[agLat, agLng], [farmLat, farmLng]], {
                color: '#16a34a', weight: 3, dashArray: '8 5', opacity: 0.8
              }).addTo(map)

              // Distance
              const R = 6371
              const dLat = (farmLat - agLat) * Math.PI / 180
              const dLng = (farmLng - agLng) * Math.PI / 180
              const a = Math.sin(dLat/2)**2 + Math.cos(agLat*Math.PI/180)*Math.cos(farmLat*Math.PI/180)*Math.sin(dLng/2)**2
              const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

              // Distance badge
              const mid = [(agLat+farmLat)/2, (agLng+farmLng)/2] as [number,number]
              const distIcon = L.divIcon({
                html: `<div style="background:white;border:2px solid #16a34a;color:#166534;font-weight:900;font-size:12px;padding:3px 8px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,0.2);white-space:nowrap;">~${km.toFixed(1)} km away</div>`,
                className: '',
                iconAnchor: [40, 10]
              })
              L.marker(mid, { icon: distIcon, interactive: false }).addTo(map)

              // Fit view
              map.fitBounds([[agLat, agLng], [farmLat, farmLng]], { padding: [50, 50], maxZoom: 16 })
              if (mounted) setStatus('ready')
            },
            () => {
              // No GPS — just show farm
              if (mounted) setStatus('ready')
              map.setView([farmLat, farmLng], 15)
              farmMarker.openPopup()
            },
            { timeout: 8000, maximumAge: 30000 }
          )
        } else {
          setStatus('ready')
          farmMarker.openPopup()
        }
      } else {
        setStatus('no-location')
      }
    }

    setTimeout(init, 100)

    return () => {
      mounted = false
      if (mapInst.current) { try { mapInst.current.remove() } catch (_) {} mapInst.current = null }
    }
  }, [harvest.id])

  if (status === 'no-location') return (
    <div className="bg-gray-100 rounded-2xl h-52 flex flex-col items-center justify-center gap-2">
      <span className="text-4xl">📍</span>
      <p className="text-gray-500 text-sm font-medium">Location not available</p>
      <p className="text-gray-400 text-xs text-center">Farmer has not set coordinates.<br/>Contact them directly.</p>
    </div>
  )

  return (
    <div className="relative">
      <div ref={mapRef} style={{ height: 280, borderRadius: 16, overflow: 'hidden', zIndex: 1 }} />
      {status === 'loading' && (
        <div className="absolute inset-0 bg-gray-100 rounded-2xl flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <Spinner size={6} />
            <p className="text-gray-500 text-xs">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AgentDashboard() {
  const navigate  = useNavigate()
  const { agent, driver, roles, logout, setActiveRole } = useMobileStore()
  const agentData = agent || driver

  const [dashData, setDashData]   = useState<any>(null)
  const [loading,  setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,    setError]      = useState('')
  const [tab,      setTab]        = useState<AgentTab>('active')

  const [selectedH, setSelectedH] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError]     = useState('')
  const [successMsg, setSuccessMsg]       = useState('')

  // Quantity modal
  const [showQty, setShowQty]   = useState(false)
  const [actualKg, setActualKg] = useState('')
  const [notes,   setNotes]     = useState('')

  // Grade modal
  const [showGrade, setShowGrade] = useState(false)
  const [gradeItems, setGradeItems] = useState([
    { miraaGrade:'Grade 1', weightKg:'', pricePerKg:'' },
    { miraaGrade:'Grade 2', weightKg:'', pricePerKg:'' },
    { miraaGrade:'Gomba',   weightKg:'', pricePerKg:'' },
  ])
  const [gradeLoading, setGradeLoading] = useState(false)

  useEffect(() => {
    if (!agentData?.id) { navigate('/login', { replace:true }); return }
    load()
    const t = setInterval(() => load(false), 60_000)
    return () => clearInterval(t)
  }, [agentData?.id])

  const load = useCallback(async (spinner = true) => {
    if (!agentData?.id) return
    spinner ? setLoading(true) : setRefreshing(true)
    try {
      const r = await api.get(`/api/mobile/agent/${agentData.id}/dashboard`)
      setDashData(r.data?.data)
    } catch (e: any) {
      if (spinner) setError(e.response?.data?.error || 'Failed to load')
    } finally {
      spinner ? setLoading(false) : setRefreshing(false)
    }
  }, [agentData?.id])

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000) }

  const doAction = async (harvestId: string, endpoint: string, body: any = {}) => {
    setActionLoading(true)
    setActionError('')
    try {
      await api.patch(`/api/harvests/${harvestId}/${endpoint}`, body)
      showSuccess('Done! ✅')
      await load(false)
      if (selectedH) {
        const r = await api.get(`/api/harvests/${harvestId}`)
        setSelectedH(r.data?.data)
      }
    } catch (e: any) {
      setActionError(e.response?.data?.error || 'Action failed. Try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecordQty = async () => {
    if (!actualKg || Number(actualKg) <= 0) { setActionError('Enter a valid weight'); return }
    await doAction(selectedH.id, 'record-quantity', { actualWeightKg: Number(actualKg), agentNotes: notes || undefined })
    setShowQty(false); setActualKg(''); setNotes('')
  }

  const handleGrade = async () => {
    const valid = gradeItems.filter(g => g.weightKg && g.pricePerKg && Number(g.weightKg)>0 && Number(g.pricePerKg)>0)
    if (!valid.length) { setActionError('Enter weight and price for at least one grade'); return }
    setGradeLoading(true)
    setActionError('')
    try {
      await api.post(`/api/harvests/${selectedH.id}/grade`, {
        items: valid.map(g => ({ miraaGrade:g.miraaGrade, weightKg:Number(g.weightKg), pricePerKg:Number(g.pricePerKg) })),
        gradedBy: agentData?.fullName || 'Agent'
      })
      showSuccess('Miraa graded! Payment will be processed by SACCO. ✅')
      setShowGrade(false)
      setGradeItems([{ miraaGrade:'Grade 1', weightKg:'', pricePerKg:'' },{ miraaGrade:'Grade 2', weightKg:'', pricePerKg:'' },{ miraaGrade:'Gomba', weightKg:'', pricePerKg:'' }])
      await load(false)
      setSelectedH(null)
    } catch (e: any) {
      setActionError(e.response?.data?.error || 'Failed. Try again.')
    } finally {
      setGradeLoading(false)
    }
  }

  if (!agentData) return null

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
        <span className="text-white text-3xl font-black">IG</span>
      </div>
      <Spinner size={8} />
      <p className="text-gray-400 text-sm">Loading agent portal...</p>
    </div>
  )

  if (error && !dashData) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 gap-4">
      <p className="text-5xl">⚠️</p>
      <p className="font-bold text-gray-900">{error}</p>
      <div className="flex gap-3">
        <button onClick={() => { logout(); navigate('/login') }} className="border border-gray-200 px-5 py-3 rounded-2xl font-bold text-gray-600">Logout</button>
        <button onClick={() => load()} className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold">Retry</button>
      </div>
    </div>
  )

  const active    = dashData?.activeHarvests    || []
  const completed = dashData?.completedHarvests || []
  const prices    = dashData?.currentPrices     || []
  const notifs    = dashData?.notifications     || []
  const stats     = dashData?.stats             || {}
  const aInfo     = dashData?.agent             || agentData
  const unread    = dashData?.unreadNotifications || 0

  // ── Grade modal ──────────────────────────────────────────────────────────
  if (showGrade && selectedH) {
    const totalVal = gradeItems.reduce((s, g) => s + Number(g.weightKg||0)*Number(g.pricePerKg||0), 0)
    const totalWt  = gradeItems.reduce((s, g) => s + Number(g.weightKg||0), 0)
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-br from-teal-800 to-teal-600 px-5 pt-12 pb-5">
          <button onClick={() => { setShowGrade(false); setActionError('') }} className="text-teal-200 text-sm mb-3 block">← Back</button>
          <h1 className="text-white text-xl font-black">🌿 Grade Miraa</h1>
          <p className="text-teal-200 text-sm">{selectedH.harvestNumber} · {selectedH.member?.fullName}</p>
        </div>
        <div className="px-4 py-5 space-y-4 pb-20">
          {actionError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">⚠️ {actionError}</div>}

          {prices.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
              <p className="text-xs font-bold text-green-800 mb-2">📊 Today's Reference Prices</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {prices.map((p: any) => (
                  <div key={p.id}>
                    <p className="text-xs text-gray-500">{p.miraaGrade}</p>
                    <p className="font-black text-green-700 text-sm">KES {Number(p.buyingPrice).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gradeItems.map((item, idx) => {
            const sub = Number(item.weightKg||0) * Number(item.pricePerKg||0)
            const ref = prices.find((p: any) => p.miraaGrade === item.miraaGrade)
            const dotColor = idx===0?'bg-green-500':idx===1?'bg-blue-500':'bg-orange-500'
            return (
              <div key={item.miraaGrade} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                    <p className="font-black text-gray-900">{item.miraaGrade}</p>
                  </div>
                  {sub > 0 && <p className="text-sm font-black text-green-700">KES {Math.round(sub).toLocaleString()}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1 block">Weight (kg)</label>
                    <input type="number" value={item.weightKg} min="0" step="0.1" placeholder="0.0"
                      onChange={e => { const u=[...gradeItems]; u[idx]={...u[idx],weightKg:e.target.value}; setGradeItems(u) }}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 mb-1 block">Price/kg (KES)</label>
                    <input type="number" value={item.pricePerKg} min="0" placeholder={ref?String(Math.round(Number(ref.buyingPrice))):'0'}
                      onChange={e => { const u=[...gradeItems]; u[idx]={...u[idx],pricePerKg:e.target.value}; setGradeItems(u) }}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-teal-500" />
                    {ref && !item.pricePerKg && (
                      <button onClick={() => { const u=[...gradeItems]; u[idx]={...u[idx],pricePerKg:String(Math.round(Number(ref.buyingPrice)))}; setGradeItems(u) }}
                        className="text-xs text-teal-600 underline mt-0.5">Use today's price</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {totalVal > 0 && (
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 flex justify-between items-center">
              <div><p className="text-xs text-gray-400">Total Graded</p><p className="font-black text-gray-900">{totalWt.toFixed(1)} kg</p></div>
              <div className="text-right"><p className="text-xs text-gray-400">Farmer Payment</p><p className="text-2xl font-black text-green-700">KES {Math.round(totalVal).toLocaleString()}</p></div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-xs text-blue-700">ℹ️ As the assigned agent, you are responsible for accurate grading. The farmer will be paid based on these grades.</p>
          </div>

          <button onClick={handleGrade} disabled={gradeLoading||totalVal===0}
            className="w-full bg-teal-600 disabled:bg-teal-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
            {gradeLoading ? <><Spinner size={5} cls="text-white"/> Submitting...</> : `✅ Submit — KES ${Math.round(totalVal).toLocaleString()}`}
          </button>
        </div>
      </div>
    )
  }

  // ── Quantity modal ────────────────────────────────────────────────────────
  if (showQty && selectedH) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-purple-800 to-purple-600 px-5 pt-12 pb-5">
        <button onClick={() => { setShowQty(false); setActionError('') }} className="text-purple-200 text-sm mb-3 block">← Back</button>
        <h1 className="text-white text-xl font-black">⚖️ Record Actual Weight</h1>
        <p className="text-purple-200 text-sm">Farmer estimated: {selectedH.estimatedWeightKg || '?'} kg</p>
      </div>
      <div className="px-4 py-5 space-y-4">
        {actionError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">⚠️ {actionError}</div>}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-sm font-bold text-gray-700 mb-2">Actual Weight (kg)</label>
          <input type="number" value={actualKg} onChange={e => setActualKg(e.target.value)}
            placeholder="e.g. 47.5" step="0.1" min="0.1" inputMode="decimal"
            className="w-full px-4 py-5 border-2 border-gray-200 rounded-2xl text-5xl font-black text-center focus:outline-none focus:border-purple-500 bg-gray-50" />
          {actualKg && selectedH.estimatedWeightKg && (
            <div className={`rounded-xl p-3 mt-3 text-center text-sm font-bold ${Number(actualKg)>=Number(selectedH.estimatedWeightKg)?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
              Variance: {(Number(actualKg)-Number(selectedH.estimatedWeightKg)).toFixed(1)} kg
              {Number(actualKg)>=Number(selectedH.estimatedWeightKg) ? ' 📈' : ' 📉'}
            </div>
          )}
          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any observations..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm resize-none" />
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
          <p className="text-xs text-yellow-800">⚠️ This weight determines the farmer's payment. Weigh accurately!</p>
        </div>
        <button onClick={handleRecordQty} disabled={actionLoading || !actualKg || Number(actualKg)<=0}
          className="w-full bg-purple-600 disabled:bg-purple-300 text-white font-black py-4 rounded-2xl text-xl flex items-center justify-center gap-2">
          {actionLoading ? <><Spinner size={5} cls="text-white"/> Recording...</> : `✅ Confirm ${actualKg ? actualKg+' kg' : ''}`}
        </button>
      </div>
    </div>
  )

  // ── Harvest detail view ───────────────────────────────────────────────────
  if (selectedH) {
    const phone    = selectedH.member?.phoneNumber || ''
    const last9    = phone.replace(/[^0-9]/g, '').slice(-9)
    const waLink   = `https://wa.me/254${last9}`
    const dirLink  = selectedH.farmLatitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${selectedH.farmLatitude},${selectedH.farmLongitude}`
      : `https://www.google.com/maps/search/?q=${encodeURIComponent(selectedH.farmLocation || selectedH.member?.village || 'Igembe South')}`

    return (
      <div className="min-h-screen bg-gray-50 pb-10">
        <div className="bg-gradient-to-br from-blue-800 to-blue-600 px-5 pt-12 pb-5">
          <button onClick={() => { setSelectedH(null); setActionError('') }} className="text-blue-200 text-sm mb-3 block">← Back to Dashboard</button>
          <h1 className="text-white text-xl font-black">🌿 Harvest Details</h1>
          <p className="text-blue-200 text-sm">{selectedH.harvestNumber}</p>
          <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-bold ${STATUS_COLORS[selectedH.status] || 'bg-gray-100 text-gray-600'}`}>
            {(selectedH.status||'').replace(/_/g,' ')}
          </span>
        </div>

        <div className="px-4 py-5 space-y-4">
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
              <span>⚠️ {actionError}</span>
              <button onClick={() => setActionError('')} className="font-bold">×</button>
            </div>
          )}
          {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm">✅ {successMsg}</div>}

          {/* Farmer card */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-black text-xl">{String(selectedH.member?.fullName||'').charAt(0)}</span>
              </div>
              <div>
                <p className="font-black text-gray-900 text-lg">{selectedH.member?.fullName}</p>
                <p className="text-gray-500 text-xs">{selectedH.member?.memberNumber} · {selectedH.member?.village}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <a href={`tel:${phone}`} className="bg-blue-600 text-white text-xs font-bold py-3 rounded-xl text-center flex flex-col items-center gap-0.5">
                <span className="text-xl">📞</span> Call
              </a>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="bg-green-500 text-white text-xs font-bold py-3 rounded-xl text-center flex flex-col items-center gap-0.5">
                <span className="text-xl">💬</span> WhatsApp
              </a>
              <a href={`sms:${phone}`} className="bg-gray-600 text-white text-xs font-bold py-3 rounded-xl text-center flex flex-col items-center gap-0.5">
                <span className="text-xl">✉️</span> SMS
              </a>
            </div>
          </div>

          {/* Harvest info */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-black text-gray-900 mb-3">📋 Harvest Information</p>
            <div className="space-y-2.5">
              {[
                { label: 'Date',       value: selectedH.harvestDate ? new Date(selectedH.harvestDate).toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : '—' },
                { label: 'Location',   value: selectedH.farmLocation || selectedH.member?.village || '—' },
                { label: 'Est. Weight', value: selectedH.estimatedWeightKg > 0 ? `${selectedH.estimatedWeightKg} kg` : '—' },
                ...(selectedH.actualWeightKg > 0 ? [{ label: 'Actual Weight', value: `${selectedH.actualWeightKg} kg` }] : []),
                ...(selectedH.agentNotes ? [{ label: 'Your Notes', value: selectedH.agentNotes }] : []),
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{r.label}</span>
                  <span className="font-bold text-gray-900 text-right max-w-[200px]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Embedded Map */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <p className="font-black text-gray-900">🗺️ Farm Location</p>
              <a href={dirLink} target="_blank" rel="noopener noreferrer"
                className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                Open in Google Maps
              </a>
            </div>
            <EmbeddedMap harvest={selectedH} />
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 justify-center">
              <span>🟢 Farm</span>
              <span>🔵 You</span>
              <span>--- Route</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {selectedH.status === 'confirmed' && (
              <>
                <button onClick={() => doAction(selectedH.id, 'start-harvest')} disabled={actionLoading}
                  className="w-full bg-yellow-500 disabled:bg-yellow-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
                  {actionLoading ? <><Spinner size={5} cls="text-white"/> Starting...</> : '🌿 Start Harvesting'}
                </button>
                <button onClick={() => doAction(selectedH.id, 'remove-agent')} disabled={actionLoading}
                  className="w-full border-2 border-red-200 text-red-600 font-bold py-3 rounded-2xl">
                  ✗ Cancel / Cannot Harvest (Unassign)
                </button>
              </>
            )}
            {selectedH.status === 'harvesting' && (
              <button onClick={() => { setShowQty(true); setActualKg(''); setNotes('') }}
                className="w-full bg-purple-600 text-white font-black py-4 rounded-2xl text-lg">
                ⚖️ Record Actual Weight
              </button>
            )}
            {selectedH.status === 'picked_up' && (
              <>
                <button onClick={() => setShowGrade(true)}
                  className="w-full bg-teal-600 text-white font-black py-4 rounded-2xl text-lg">
                  🌿 Grade Miraa (Set Grades & Prices)
                </button>
                <button onClick={() => doAction(selectedH.id, 'deliver')} disabled={actionLoading}
                  className="w-full bg-orange-600 disabled:bg-orange-300 text-white font-bold py-3 rounded-2xl">
                  {actionLoading ? 'Delivering...' : '🏭 Deliver to SACCO'}
                </button>
              </>
            )}
            {selectedH.status === 'delivered_to_sacco' && (
              <button onClick={() => setShowGrade(true)}
                className="w-full bg-teal-600 text-white font-black py-4 rounded-2xl text-lg">
                🌿 Grade Miraa
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Main agent dashboard ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 px-5 pt-12 pb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full translate-x-12 -translate-y-12" />
        <div className="absolute left-0 bottom-0 w-28 h-28 bg-white/5 rounded-full -translate-x-6 translate-y-6" />

        <div className="flex justify-between items-start relative mb-5">
          <div>
            <p className="text-blue-300 text-xs font-medium tracking-wide">🌿 AGENT PORTAL</p>
            <h1 className="text-white text-2xl font-black mt-0.5">
              {String(aInfo?.fullName||'').split(' ')[0]}!
            </h1>
            <p className="text-blue-300 text-xs">{aInfo?.agentCode} · {aInfo?.vehicleReg || 'No vehicle'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => load(false)} className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              {refreshing ? <Spinner size={4} cls="text-white"/> : <span className="text-white">🔄</span>}
            </button>
            {roles?.includes('farmer') && (
              <button onClick={() => { setActiveRole('farmer'); navigate('/farmer') }}
                className="w-10 h-10 bg-green-500/60 rounded-xl flex items-center justify-center">
                <span>🌿</span>
              </button>
            )}
            {unread > 0 && (
              <div className="relative">
                <button onClick={() => setTab('profile')} className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                  <span>🔔</span>
                </button>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">{unread}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 relative">
          {[
            { label:'Assigned',  value: stats.confirmed || 0 },
            { label:'Harvesting', value: stats.harvesting || 0 },
            { label:'Transit',   value: stats.inTransit || 0 },
            { label:'Done',      value: stats.totalCompleted || 0 },
          ].map(s => (
            <div key={s.label} className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-blue-300 text-xs">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick price preview */}
        {prices.length > 0 && (
          <div className="mt-3 bg-white/10 rounded-2xl p-3 relative">
            <p className="text-blue-200 text-xs font-bold mb-2">📊 Today's Miraa Prices</p>
            <div className="grid grid-cols-3 gap-2">
              {prices.map((p: any) => (
                <div key={p.id} className="text-center">
                  <p className="text-blue-300 text-xs">{p.miraaGrade}</p>
                  <p className="text-white font-black text-sm">KES {Number(p.buyingPrice).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="px-4 mt-3 space-y-2">
        {successMsg && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm">{successMsg}</div>}
        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
            <span>⚠️ {actionError}</span>
            <button onClick={() => setActionError('')} className="font-black">×</button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 mt-3">
        <div className="flex gap-1.5 bg-gray-100 rounded-2xl p-1.5">
          {[
            { id:'active',    label:`🌿 Active (${active.length})` },
            { id:'completed', label:`✅ Done (${completed.length})` },
            { id:'prices',    label:'📊 Prices' },
            { id:'profile',   label:'👤 Profile' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as AgentTab)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${tab===t.id?'bg-white text-blue-700 shadow-sm':'text-gray-500'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Active Harvests ── */}
      {tab === 'active' && (
        <div className="px-4 mt-4 space-y-4">
          {active.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <p className="text-5xl mb-4">✅</p>
              <p className="font-bold text-gray-900">No active assignments</p>
              <p className="text-gray-400 text-sm mt-1">All caught up! 🎉</p>
            </div>
          ) : (
            active.map((h: any) => (
              <button key={h.id} onClick={() => setSelectedH(h)}
                className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left active:scale-[0.98] transition-transform">
                <div className={`flex justify-between items-center px-4 py-2.5 ${STATUS_COLORS[h.status]||'bg-gray-100'}`}>
                  <span className="font-black text-sm">{h.harvestNumber}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold capitalize">{(h.status||'').replace(/_/g,' ')}</span>
                    <span className="text-base font-black opacity-60">›</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-green-700 font-black">{String(h.member?.fullName||'').charAt(0)}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-900">{h.member?.fullName}</p>
                      <p className="text-gray-400 text-xs">{h.member?.village} · {h.member?.memberNumber}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-500 mb-2">
                    {h.harvestDate && <span>📅 {new Date(h.harvestDate).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</span>}
                    {h.farmLocation && <span className="truncate">📍 {h.farmLocation}</span>}
                    {h.member?.phoneNumber && <span>📞 {h.member.phoneNumber}</span>}
                    {h.estimatedWeightKg > 0 && <span>⚖️ Est: {h.estimatedWeightKg} kg</span>}
                  </div>
                  <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-700 font-medium">
                    👆 Tap to view details, map & take action → {STATUS_NEXT[h.status] || 'View'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── Completed ── */}
      {tab === 'completed' && (
        <div className="px-4 mt-4 space-y-3">
          {completed.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center shadow-sm">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-bold text-gray-700">No completed harvests yet</p>
            </div>
          ) : (
            completed.map((h: any) => {
              const val  = Number(h.totalValue||0)
              const varKg= Number(h.weightVarianceKg||0)
              return (
                <div key={h.id} className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{h.harvestNumber}</p>
                      <p className="text-gray-400 text-xs">{h.member?.fullName} · {h.member?.village}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${STATUS_COLORS[h.status]||'bg-gray-100 text-gray-600'}`}>{h.status}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-gray-400">Estimated</p>
                      <p className="font-bold text-blue-600">{h.estimatedWeightKg>0?h.estimatedWeightKg+' kg':'—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-gray-400">Actual</p>
                      <p className="font-bold">{h.actualWeightKg>0?h.actualWeightKg+' kg':'—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2">
                      <p className="text-gray-400">Variance</p>
                      <p className={`font-bold ${varKg>=0?'text-green-600':'text-red-500'}`}>{varKg!==0?`${varKg>=0?'+':''}${varKg.toFixed(1)} kg`:'—'}</p>
                    </div>
                  </div>
                  {val > 0 && <p className="text-center font-black text-green-600 mt-2 text-sm">KES {val.toLocaleString()} earned</p>}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── Prices ── */}
      {tab === 'prices' && (
        <div className="px-4 mt-4 space-y-4">
          <p className="font-black text-gray-900">📊 Current Miraa Prices</p>
          {prices.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
              <p className="text-gray-400">No prices set today</p>
            </div>
          ) : (
            prices.map((p: any) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-black text-gray-900 text-xl">{p.miraaGrade}</p>
                    <p className="text-gray-400 text-xs">{p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString('en-KE') : 'Today'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Buying Price</p>
                    <p className="font-black text-green-700 text-3xl">KES {Number(p.buyingPrice).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Selling: KES {Number(p.sellingPrice).toLocaleString()}/kg</p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-xs text-blue-700">ℹ️ Use the buying price when grading farmer miraa. Prices are set daily by the SACCO office.</p>
          </div>
        </div>
      )}

      {/* ── Profile ── */}
      {tab === 'profile' && (
        <div className="px-4 mt-4 space-y-4">
          <div className="bg-gradient-to-br from-blue-800 to-blue-600 rounded-3xl p-5 text-white shadow-lg text-center">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-4xl font-black">{String(aInfo?.fullName||'').charAt(0)}</span>
            </div>
            <h3 className="text-2xl font-black">{aInfo?.fullName}</h3>
            <p className="text-blue-200 text-sm">{aInfo?.agentCode}</p>
            <p className="text-blue-300 text-xs mt-1">{aInfo?.role || 'Harvest Agent'}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2.5">
            <p className="font-black text-gray-900 mb-2">Agent Details</p>
            {[
              { label:'📱 Phone',    value: aInfo?.phoneNumber },
              { label:'🚗 Vehicle',  value: aInfo?.vehicleReg || 'Not set' },
              { label:'🔑 Code',     value: aInfo?.agentCode },
              { label:'📋 Role',     value: aInfo?.role || 'Harvest Agent' },
            ].map(r => (
              <div key={r.label} className="flex justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 text-sm">{r.label}</span>
                <span className="font-bold text-gray-900 text-sm">{r.value||'—'}</span>
              </div>
            ))}
          </div>

          {/* Notifications */}
          {notifs.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <p className="font-black text-gray-900 mb-3">🔔 Notifications</p>
              <div className="space-y-2">
                {notifs.slice(0,5).map((n: any) => (
                  <div key={n.id} className={`p-3 rounded-xl ${n.isRead?'bg-gray-50':'bg-blue-50 border border-blue-100'}`}>
                    <p className="font-bold text-sm text-gray-900">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('en-KE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SACCO Office */}
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-2">
            <p className="font-black text-gray-900 mb-2">🏦 SACCO Office</p>
            <a href="tel:0757630995" className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
              <span className="text-2xl">📞</span>
              <div>
                <p className="font-bold text-sm text-gray-900">Call SACCO Office</p>
                <p className="text-green-600 text-xs">0757 630 995</p>
              </div>
            </a>
            <a href="https://wa.me/254757630995" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
              <span className="text-2xl">💬</span>
              <div>
                <p className="font-bold text-sm text-gray-900">WhatsApp SACCO</p>
                <p className="text-green-600 text-xs">+254 757 630 995</p>
              </div>
            </a>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <span className="text-2xl">🕐</span>
              <div>
                <p className="font-bold text-sm text-gray-900">Office Hours</p>
                <p className="text-gray-500 text-xs">Mon–Fri · 8:00am – 5:00pm</p>
              </div>
            </div>
          </div>

          <button onClick={() => { logout(); navigate('/login',{replace:true}) }}
            className="w-full bg-red-50 border border-red-200 text-red-600 font-bold py-3 rounded-2xl text-sm">
            🚪 Sign Out
          </button>
        </div>
      )}
    </div>
  )
}