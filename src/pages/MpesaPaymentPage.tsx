import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function MpesaPaymentPage() {
  const navigate = useNavigate()
  const { type } = useParams<{ type: string }>()
  const { member } = useMobileStore()
  const [amount, setAmount] = useState('')
  const [phone, setPhone] = useState(member?.phoneNumber || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [checkoutId, setCheckoutId] = useState('')

  const isDeposit = type === 'deposit'
  const isWithdraw = type === 'withdraw'
  const isRepay = type === 'repay'

  const config = {
    deposit: {
      title: 'Deposit Savings',
      desc: 'An M-Pesa prompt will be sent to your phone.',
      color: 'from-green-800 to-green-600',
      btnColor: 'bg-green-600',
      icon: '📥',
      successIcon: '📱',
      successTitle: 'Check Your Phone!',
      successDesc: 'Enter your M-Pesa PIN to complete the deposit.',
      btnText: 'Send M-Pesa Prompt'
    },
    withdraw: {
      title: 'Withdraw Savings',
      desc: 'Money will be sent to your M-Pesa within minutes.',
      color: 'from-blue-800 to-blue-600',
      btnColor: 'bg-blue-600',
      icon: '💸',
      successIcon: '💸',
      successTitle: 'Withdrawal Initiated!',
      successDesc: 'Money will arrive on your M-Pesa shortly.',
      btnText: 'Withdraw Now'
    },
    repay: {
      title: 'Loan Repayment',
      desc: 'An M-Pesa prompt will be sent to complete repayment.',
      color: 'from-purple-800 to-purple-600',
      btnColor: 'bg-purple-600',
      icon: '💰',
      successIcon: '✅',
      successTitle: 'Check Your Phone!',
      successDesc: 'Enter your M-Pesa PIN to complete the repayment.',
      btnText: 'Send M-Pesa Prompt'
    }
  }

  const current = config[type as keyof typeof config] || config.deposit
  const transactionFee = amount ? Math.ceil(Number(amount) * 0.01) : 0
  const finalAmount = amount
    ? isWithdraw
      ? Number(amount) - transactionFee
      : Number(amount) + transactionFee
    : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) < 100) { setError('Minimum amount is KES 100'); return }
    setLoading(true)
    setError('')
    try {
      if (isDeposit || isRepay) {
        const response = await api.post('/api/mpesa/stk-push', {
          phoneNumber: phone,
          amount: Number(amount) + transactionFee,
          accountReference: isRepay ? 'Loan Repayment' : 'Savings Deposit',
          transactionDesc: isRepay
            ? `Loan repayment - ${member?.memberNumber}`
            : `Savings deposit - ${member?.memberNumber}`
        })
        setCheckoutId(response.data.checkoutRequestId || '')
        setSuccess(true)
      } else if (isWithdraw) {
        await api.post('/api/mpesa/withdraw', {
          phoneNumber: phone,
          amount: Number(amount) - transactionFee,
          memberId: member?.id,
          remarks: `Savings withdrawal - ${member?.memberNumber}`
        })
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className={`min-h-screen bg-gradient-to-br ${current.color} flex flex-col items-center justify-center p-6 text-center`}>
      <div className="text-6xl mb-6">{current.successIcon}</div>
      <h1 className="text-2xl font-black text-white mb-3">{current.successTitle}</h1>
      <p className="text-white text-opacity-80 mb-2">{current.successDesc}</p>
      {checkoutId && (
        <div className="bg-white bg-opacity-20 rounded-2xl p-4 mb-6 w-full max-w-xs">
          <p className="text-white text-opacity-70 text-xs mb-1">Checkout Reference</p>
          <p className="text-white font-mono text-sm break-all">{checkoutId}</p>
        </div>
      )}
      {!checkoutId && isWithdraw && (
        <div className="bg-white bg-opacity-20 rounded-2xl p-4 mb-6">
          <p className="text-white text-opacity-70 text-xs mb-1">Amount</p>
          <p className="text-white font-black text-2xl">KES {finalAmount.toLocaleString()}</p>
          <p className="text-white text-opacity-60 text-xs mt-1">Sending to {phone}</p>
        </div>
      )}
      <div className="space-y-3 w-full max-w-xs">
        <button onClick={() => navigate('/farmer')}
          className="w-full bg-white text-gray-800 font-bold py-4 rounded-2xl text-lg">
          Back to Dashboard
        </button>
        <button onClick={() => { setSuccess(false); setAmount(''); setError('') }}
          className="w-full bg-white bg-opacity-20 text-white font-bold py-3 rounded-2xl">
          Make Another Payment
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className={`bg-gradient-to-br ${current.color} px-5 pt-12 pb-8`}>
        <button onClick={() => navigate('/farmer')}
          className="text-white text-opacity-70 text-sm mb-4 flex items-center gap-2">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{current.icon}</span>
          <div>
            <h1 className="text-2xl font-black text-white">{current.title}</h1>
            <p className="text-white text-opacity-70 text-sm mt-0.5">{current.desc}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {error}
            <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                📱 M-Pesa Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0712345678"
                required
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-lg focus:outline-none focus:border-green-500 bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1">
                {isWithdraw ? 'Money will be sent to this number' : 'M-Pesa prompt will be sent here'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                💰 Amount (KES)
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
                min="100"
                inputMode="numeric"
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-black focus:outline-none focus:border-green-500 bg-gray-50"
              />
              <p className="text-xs text-gray-400 mt-1">Minimum: KES 100</p>
            </div>
          </div>

          {/* Payment Summary */}
          {amount && Number(amount) >= 100 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border-l-4 border-green-500">
              <p className="font-black text-gray-900 mb-3">Payment Summary</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount entered</span>
                  <span className="font-bold">KES {Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Transaction fee (1%)</span>
                  <span className="font-bold text-orange-500">KES {transactionFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-base">
                  <span className="text-gray-900">
                    You {isWithdraw ? 'receive' : 'pay total'}
                  </span>
                  <span className="text-green-600">
                    KES {finalAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !amount || Number(amount) < 100}
            className={`w-full ${current.btnColor} disabled:opacity-40 text-white font-black py-5 rounded-2xl text-xl shadow-lg flex items-center justify-center gap-2`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing...
              </>
            ) : `${current.icon} ${current.btnText}`}
          </button>
        </form>

        {/* Sandbox Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs text-blue-700 font-bold mb-1">📋 M-Pesa Integration</p>
          <p className="text-xs text-blue-600">
            Currently running on M-Pesa sandbox. Real payments will be enabled once production credentials are set up.
          </p>
        </div>
      </div>
    </div>
  )
}