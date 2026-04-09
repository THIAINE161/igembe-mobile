import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../lib/api'

export default function HarvestInvoiceMobilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [harvest, setHarvest] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/api/harvests/${id}`)
      .then(r => setHarvest(r.data.data))
      .catch(() => navigate(-1))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  )

  if (!harvest) return null

  const totalValue = harvest.items.reduce((s: number, i: any) => s + Number(i.totalValue), 0)
  const invoiceNumber = `INV-${harvest.harvestNumber}-${new Date(harvest.updatedAt).getFullYear()}`

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-100">
        {/* Action Bar */}
        <div className="no-print bg-green-700 px-5 pt-10 pb-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-green-200 text-sm">← Back</button>
          <h1 className="text-white font-black">Payment Invoice</h1>
          <button
            onClick={() => window.print()}
            className="bg-white text-green-700 text-xs px-3 py-2 rounded-xl font-bold"
          >
            🖨️ Print
          </button>
        </div>

        {/* Invoice */}
        <div className="p-4">
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-700 to-green-500 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                  <span className="text-green-700 font-black text-lg">IG</span>
                </div>
                <div>
                  <p className="text-white font-black leading-tight">Igembe Miraa Farmers SACCO</p>
                  <p className="text-green-100 text-xs">Igembe South, Meru County, Kenya</p>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-green-100 text-xs">Invoice Number</p>
                  <p className="text-white font-black">{invoiceNumber}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-xl ${
                  harvest.status === 'paid' ? 'bg-green-400 bg-opacity-40' : 'bg-yellow-400 bg-opacity-40'
                }`}>
                  <p className="text-white font-black text-sm">
                    {harvest.status === 'paid' ? '✅ PAID' : '⏳ PENDING'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Farmer Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-2">Farmer</p>
                  <p className="font-black text-gray-900 text-sm">{harvest.member.fullName}</p>
                  <p className="text-gray-500 text-xs">{harvest.member.memberNumber}</p>
                  <p className="text-gray-500 text-xs">{harvest.member.phoneNumber}</p>
                  <p className="text-gray-500 text-xs">{harvest.member.village}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-2">Harvest</p>
                  <p className="font-black text-gray-900 text-sm">{harvest.harvestNumber}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(harvest.harvestDate).toLocaleDateString('en-KE')}
                  </p>
                  {harvest.farmLocation && (
                    <p className="text-gray-500 text-xs">📍 {harvest.farmLocation}</p>
                  )}
                  {harvest.assignedDriver && (
                    <p className="text-gray-500 text-xs">🚗 {harvest.assignedDriver}</p>
                  )}
                </div>
              </div>

              {/* Grade Table */}
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase mb-3">Grading Breakdown</p>
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-4 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500">
                    <span>Grade</span>
                    <span className="text-center">Weight</span>
                    <span className="text-center">Price/kg</span>
                    <span className="text-right">Amount</span>
                  </div>
                  {harvest.items.map((item: any) => (
                    <div key={item.id} className="grid grid-cols-4 px-3 py-3 border-t border-gray-100 text-sm">
                      <span className="font-medium">{item.miraaGrade}</span>
                      <span className="text-center text-gray-600">{item.weightKg}kg</span>
                      <span className="text-center text-gray-600">
                        {Number(item.pricePerKg).toLocaleString()}
                      </span>
                      <span className="text-right font-bold text-green-600">
                        {Number(item.totalValue).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="grid grid-cols-4 px-3 py-3 bg-green-50 border-t border-green-200">
                    <span className="col-span-3 font-black text-gray-900">TOTAL PAYMENT</span>
                    <span className="text-right font-black text-green-600 text-lg">
                      {totalValue.toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-right text-xs text-gray-400 mt-1">Amount in KES</p>
              </div>

              {/* M-Pesa Reference */}
              {harvest.notes && harvest.notes.includes('Payment:') && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-blue-600 uppercase mb-1">M-Pesa Reference</p>
                  <p className="font-black text-blue-900 font-mono">
                    {harvest.notes.split('Payment:')[1]?.trim()}
                  </p>
                </div>
              )}

              {/* Total Box */}
              <div className="bg-green-600 rounded-2xl p-4 text-center text-white">
                <p className="text-green-100 text-sm mb-1">Total Amount Paid to Farmer</p>
                <p className="text-4xl font-black">KES {totalValue.toLocaleString()}</p>
                {harvest.status === 'paid' && (
                  <p className="text-green-200 text-xs mt-1">
                    ✅ Paid on {new Date(harvest.updatedAt).toLocaleDateString('en-KE')}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="text-center border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400">
                  Official receipt from Igembe Miraa Farmers SACCO
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  Generated {new Date().toLocaleDateString('en-KE')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}