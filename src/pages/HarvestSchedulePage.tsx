import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

// ── Tap-to-pin farm location picker (optional) ────────────────────────────────
// Kept deliberately simple: tap/click anywhere on the map to drop a pin, or
// drag the pin once placed. No route/live-tracking here — that's the agent
// dashboard's job; this just captures a single point.
function FarmLocationPicker({
  lat, lng, onPick,
}: {
  lat: number | null
  lng: number | null
  onPick: (lat: number, lng: number) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<any>(null)
  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return

    const defaultLat = lat ?? -0.3
    const defaultLng = lng ?? 37.65

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView([defaultLat, defaultLng], lat != null ? 16 : 11)
    mapInst.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const pinIcon = L.divIcon({
      html: `<div style="background:#16a34a;color:white;border-radius:50% 50% 50% 0;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 10px rgba(0,0,0,0.35);transform:rotate(-45deg);border:3px solid white;">
               <span style="transform:rotate(45deg)">🌿</span>
             </div>`,
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    })

    const placeMarker = (latlng: { lat: number; lng: number }) => {
      if (markerRef.current) {
        markerRef.current.setLatLng(latlng)
      } else {
        markerRef.current = L.marker(latlng, { icon: pinIcon, draggable: true }).addTo(map)
        markerRef.current.on('dragend', () => {
          const p = markerRef.current.getLatLng()
          onPick(p.lat, p.lng)
        })
      }
    }

    if (lat != null && lng != null) placeMarker({ lat, lng })

    map.on('click', (e: any) => {
      placeMarker(e.latlng)
      onPick(e.latlng.lat, e.latlng.lng)
    })

    // Best-effort: center on the farmer's current GPS position if no pin yet.
    if (lat == null && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => map.setView([pos.coords.latitude, pos.coords.longitude], 15),
        () => {},
        { timeout: 5000 }
      )
    }

    return () => {
      try { map.remove() } catch (_) {}
      mapInst.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={mapRef} style={{ height: 220, borderRadius: 16, overflow: 'hidden' }} />
}

export default function HarvestSchedulePage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()
  const [form, setForm] = useState({
    harvestDate: '',
    farmLocation: '',
    estimatedWeightKg: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<any>(null)

  // Optional exact-location pin
  const [showMap, setShowMap] = useState(false)
  const [farmLat, setFarmLat] = useState<number | null>(null)
  const [farmLng, setFarmLng] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  // One-tap GPS capture — quicker than tap-to-pin for a farmer standing on
  // their own farm. Saves real coordinates so this harvest's map always
  // works later (no text-location guessing needed on the agent side).
  const useMyGpsLocation = () => {
    if (!navigator.geolocation) { setGpsStatus('error'); return }
    setGpsStatus('loading')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFarmLat(pos.coords.latitude)
        setFarmLng(pos.coords.longitude)
        setShowMap(true)
        setGpsStatus('success')
      },
      () => setGpsStatus('error'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  if (!member) { navigate('/login', { replace: true }); return null }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.harvestDate) { setError('Please select a harvest date'); return }
    setLoading(true)
    setError('')
    try {
      const r = await api.post('/api/harvests', {
        memberId: member.id,
        harvestDate: form.harvestDate,
        farmLocation: form.farmLocation.trim() || null,
        farmLatitude: farmLat ?? undefined,
        farmLongitude: farmLng ?? undefined,
        estimatedWeightKg: form.estimatedWeightKg ? Number(form.estimatedWeightKg) : undefined,
        notes: form.notes.trim() || null
      })
      setSuccess(r.data.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-5xl">✅</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Harvest Scheduled!</h2>
        <div className="bg-green-50 rounded-2xl p-4 mb-5 text-left">
          <p className="text-xs text-gray-500">Reference Number</p>
          <p className="font-black text-green-700 text-xl">{success.harvestNumber}</p>
          <p className="text-xs text-gray-500 mt-2">Date</p>
          <p className="font-bold text-gray-900">
            {new Date(success.harvestDate).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          {form.farmLocation && (
            <>
              <p className="text-xs text-gray-500 mt-2">Location</p>
              <p className="font-bold text-gray-900">{form.farmLocation}</p>
            </>
          )}
          {farmLat != null && farmLng != null && (
            <p className="text-xs text-green-600 font-bold mt-2">📍 Exact location pinned on map</p>
          )}
        </div>
        <p className="text-gray-500 text-sm mb-5">An agent will be assigned soon. You will receive an SMS confirmation.</p>
        <button onClick={() => navigate('/farmer')} className="w-full bg-green-600 text-white font-black py-3 rounded-2xl">
          Back to Dashboard
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-green-200 text-sm mb-4 block">← Back</button>
        <h1 className="text-white text-xl font-black">🌿 Schedule Harvest Pickup</h1>
        <p className="text-green-200 text-sm mt-1">An agent will be assigned and contact you.</p>
      </div>
      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
            <span>⚠️ {error}</span><button onClick={() => setError('')} className="font-bold">×</button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📅 Harvest Date *</label>
            <input type="date" value={form.harvestDate} onChange={e => setForm(f => ({ ...f, harvestDate: e.target.value }))}
              min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📍 Farm Location</label>
            <input type="text" value={form.farmLocation} onChange={e => setForm(f => ({ ...f, farmLocation: e.target.value }))}
              placeholder="e.g. Mutuati, Laare, Maua"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm" />

            {/* One-tap GPS capture */}
            <button type="button" onClick={useMyGpsLocation} disabled={gpsStatus === 'loading'}
              className="w-full mt-2 bg-blue-50 border-2 border-blue-200 disabled:opacity-60 text-blue-700 text-xs font-bold py-2.5 rounded-xl hover:border-blue-400 transition-colors flex items-center justify-center gap-2">
              {gpsStatus === 'loading' ? '⏳ Getting your location...' : '📍 Use My Current GPS Location'}
            </button>
            {gpsStatus === 'success' && <p className="text-xs text-green-600 font-bold mt-1">✅ GPS location saved</p>}
            {gpsStatus === 'error' && <p className="text-xs text-red-500 font-bold mt-1">Couldn't get your location. Check location permissions.</p>}

            {/* Optional exact-pin map */}
            {!showMap ? (
              <button type="button" onClick={() => setShowMap(true)}
                className="w-full mt-2 border-2 border-dashed border-gray-200 text-gray-500 text-xs font-bold py-2.5 rounded-xl hover:border-green-400 hover:text-green-600 transition-colors">
                🗺️ Pin exact location on map (optional)
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                <FarmLocationPicker lat={farmLat} lng={farmLng} onPick={(la, ln) => { setFarmLat(la); setFarmLng(ln) }} />
                <p className="text-xs text-gray-400">Tap anywhere on the map to drop a pin, or drag it to adjust.</p>
                <div className="flex items-center justify-between">
                  {farmLat != null ? (
                    <span className="text-xs font-bold text-green-700">📍 Pin set ({farmLat.toFixed(4)}, {farmLng!.toFixed(4)})</span>
                  ) : <span className="text-xs text-gray-400">No pin placed yet</span>}
                  <button type="button"
                    onClick={() => { setShowMap(false); setFarmLat(null); setFarmLng(null) }}
                    className="text-xs font-bold text-red-500">
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">⚖️ Estimated Weight (kg)</label>
            <input type="number" value={form.estimatedWeightKg} onChange={e => setForm(f => ({ ...f, estimatedWeightKg: e.target.value }))}
              placeholder="e.g. 50" min="1" step="0.5" inputMode="decimal"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📝 Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any special notes..." rows={2}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
            {loading ? (
              <><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Scheduling...</>
            ) : '✅ Schedule Pickup'}
          </button>
        </form>
      </div>
    </div>
  )
}
