import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function HarvestInvoiceMobilePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { member } = useMobileStore()
  const [harvest, setHarvest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) { setError('No harvest ID provided'); setLoading(false); return }
    fetchHarvest()
  }, [id])

  const fetchHarvest = async () => {
    try {
      const r = await api.get(`/api/harvests/${id}`)
      if (r.data?.data) {
        setHarvest(r.data.data)
      } else {
        setError('Harvest not found')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load invoice'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-white text-2xl font-black">IG</span>
      </div>
      <svg className="animate-spin h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <p className="text-gray-500 text-sm mt-3">Loading invoice...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <p className="text-5xl mb-4">⚠️</p>
      <p className="font-bold text-gray-900 mb-2">Failed to load invoice</p>
      <p className="text-gray-500 text-sm text-center mb-6">{error}</p>
      <div className="flex gap-3">
        <button onClick={() => navigate('/farmer')}
          className="bg-gray-600 text-white px-5 py-3 rounded-2xl font-bold">
          ← Dashboard
        </button>
        <button onClick={fetchHarvest}
          className="bg-green-600 text-white px-5 py-3 rounded-2xl font-bold">
          Try Again
        </button>
      </div>
    </div>
  )

  if (!harvest) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <p className="text-5xl mb-4">🌿</p>
      <p className="font-bold text-gray-900 mb-2">Invoice Not Found</p>
      <button onClick={() => navigate('/farmer')}
        className="mt-4 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold">
        Back to Dashboard
      </button>
    </div>
  )

  const items = harvest.items || []
  const totalValue = items.reduce((s: number, i: any) => s + Number(i.totalValue || i.total_value || 0), 0)
  const memberName = harvest.member?.fullName || member?.fullName || '—'
  const memberNumber = harvest.member?.memberNumber || member?.memberNumber || '—'
  const harvestDate = harvest.harvestDate || harvest.harvest_date
  const harvestNumber = harvest.harvestNumber || harvest.harvest_number
  const actualWeight = Number(harvest.actualWeightKg || harvest.actual_weight_kg || 0)
  const estimatedWeight = Number(harvest.estimatedWeightKg || harvest.estimated_weight_kg || 0)
  const agentName = harvest.agentName || harvest.agent_name || '—'

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .invoice-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Top bar — hidden on print */}
      <div className="no-print bg-white border-b border-gray-200 px-5 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/farmer')}
            className="flex items-center gap-2 text-gray-600 font-medium text-sm">
            ← Back
          </button>
          <h1 className="font-black text-gray-900">Harvest Invoice</h1>
          <button onClick={handlePrint}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Invoice */}
      <div className="p-4 max-w-lg mx-auto">
        <div ref={printRef} className="invoice-card bg-white rounded-3xl shadow-sm overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-green-800 to-green-600 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center">
                <span className="text-green-700 text-xl font-black">IG</span>
              </div>
              <div className="text-right">
                <p className="font-black text-xl">HARVEST INVOICE</p>
                <p className="text-green-200 text-xs">Igembe Miraa Farmers SACCO</p>
              </div>
            </div>
            <div className="border-t border-white border-opacity-20 pt-4">
              <p className="text-green-200 text-xs mb-0.5">Invoice Number</p>
              <p className="text-white font-black text-2xl">{harvestNumber}</p>
            </div>
          </div>

          {/* Details */}
          <div className="p-5 space-y-4">

            {/* Member & Harvest Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">FARMER DETAILS</p>
                <p className="font-black text-gray-900">{memberName}</p>
                <p className="text-green-600 font-medium text-sm">{memberNumber}</p>
                {harvest.member?.phoneNumber && (
                  <p className="text-gray-500 text-xs mt-1">{harvest.member.phoneNumber}</p>
                )}
                {harvest.member?.village && (
                  <p className="text-gray-500 text-xs">{harvest.member.village}</p>
                )}
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-gray-500 mb-2">HARVEST INFO</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium">
                      {harvestDate ? new Date(harvestDate).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      }) : '—'}
                    </span>
                  </div>
                  {harvest.farmLocation && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Location</span>
                      <span className="font-medium text-right text-xs">{harvest.farmLocation}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Agent</span>
                    <span className="font-medium text-xs text-right">{agentName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Status</span>
                    <span className="font-bold text-green-600 capitalize">{harvest.status}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weight Summary */}
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-blue-700 mb-3">WEIGHT SUMMARY</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-500">Estimated</p>
                  <p className="font-black text-blue-600">
                    {estimatedWeight > 0 ? `${estimatedWeight} kg` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Actual</p>
                  <p className="font-black text-gray-900">{actualWeight > 0 ? `${actualWeight} kg` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Variance</p>
                  {estimatedWeight > 0 && actualWeight > 0 ? (
                    <p className={`font-black ${actualWeight >= estimatedWeight ? 'text-green-600' : 'text-red-500'}`}>
                      {actualWeight >= estimatedWeight ? '+' : ''}
                      {(actualWeight - estimatedWeight).toFixed(1)} kg
                    </p>
                  ) : (
                    <p className="font-black text-gray-400">—</p>
                  )}
                </div>
              </div>
            </div>

            {/* Grading Breakdown */}
            {items.length > 0 ? (
              <div>
                <p className="text-xs font-bold text-gray-500 mb-3">GRADING BREAKDOWN</p>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-3 py-2 text-xs font-bold text-gray-500">Grade</th>
                      <th className="text-right px-3 py-2 text-xs font-bold text-gray-500">Weight (kg)</th>
                      <th className="text-right px-3 py-2 text-xs font-bold text-gray-500">Price/kg</th>
                      <th className="text-right px-3 py-2 text-xs font-bold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="px-3 py-2.5 text-sm font-bold">{item.miraaGrade || item.miraa_grade}</td>
                        <td className="px-3 py-2.5 text-sm text-right">{Number(item.weightKg || item.weight_kg)}</td>
                        <td className="px-3 py-2.5 text-sm text-right">
                          KES {Number(item.pricePerKg || item.price_per_kg).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-sm text-right font-bold text-green-700">
                          KES {Number(item.totalValue || item.total_value).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-green-50 border-t-2 border-green-200">
                      <td colSpan={3} className="px-3 py-3 font-black text-gray-900">TOTAL PAYMENT</td>
                      <td className="px-3 py-3 font-black text-green-700 text-right text-lg">
                        KES {totalValue.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-2xl p-4 text-center">
                <p className="text-yellow-700 text-sm">Grading details not yet available</p>
              </div>
            )}

            {/* Payment confirmation */}
            {harvest.status === 'paid' && (
              <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-center">
                <p className="text-3xl mb-2">✅</p>
                <p className="font-black text-green-800 text-lg">PAYMENT CONFIRMED</p>
                <p className="text-green-600 text-sm font-bold">
                  KES {totalValue.toLocaleString()} paid to your M-Pesa
                </p>
                {harvest.notes && harvest.notes.includes('Payment') && (
                  <p className="text-green-500 text-xs mt-1">{harvest.notes}</p>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Igembe Miraa Farmers SACCO</span>
                <span>Igembe South, Meru County</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>© 2026 Igembe Tech Solutions Ltd</span>
                <span>Printed: {new Date().toLocaleDateString('en-KE')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons — hidden on print */}
        <div className="no-print mt-4 space-y-3 pb-8">
          <button onClick={handlePrint}
            className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
            🖨️ Print Invoice
          </button>
          <button onClick={() => navigate('/farmer')}
            className="w-full border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-2xl">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}