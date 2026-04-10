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

  const getTitle = () => {
    if (isDeposit) return 'Deposit to Savings'
    if (isWithdraw) return 'Withdraw from Savings'
    if (isRepay) return 'Repay Loan via M-Pesa'
    return 'M-Pesa Payment'
  }

  const getDescription = () => {
    if (isDeposit) return 'You will receive an M-Pesa prompt on your phone to complete the deposit.'
    if (isWithdraw) return 'Money will be sent to your M-Pesa number within minutes.'
    if (isRepay) return 'You will receive an M-Pesa prompt to complete your loan repayment.'
    return ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) < 100) {
      setError('Minimum amount is KES 100')
      return
    }
    setLoading(true)
    setError('')

    try {
      if (isDeposit || isRepay) {
        // STK Push — prompts farmer's phone
        const response = await api.post('/api/mpesa/stk-push', {
          phoneNumber: phone,
          amount: Number(amount),
          accountReference: isRepay ? 'Loan Repayment' : 'Savings Deposit',
          transactionDesc: isRepay
            ? `Loan repayment by ${member?.fullName}`
            : `Savings deposit by ${member?.fullName}`
        })
        setCheckoutId(response.data.checkoutRequestId)
        setSuccess(true)
      } else if (isWithdraw) {
        // B2C — send money to farmer
        const response = await api.post('/api/mpesa/withdraw', {
          phoneNumber: phone,
          amount: Number(amount),
          memberId: member?.id,
          remarks: `Savings withdrawal by ${member?.fullName}`
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
    <div className="min-h-screen bg-green-600 flex flex-col items-center justify-center p-6 text-center">
      <div className="text-6xl mb-6">{isWithdraw ? '💸' : '📱'}</div>
      <h1 className="text-2xl font-black text-white mb-3">
        {isWithdraw ? 'Withdrawal Initiated!' : 'Check Your Phone!'}
      </h1>
      {isDeposit || isRepay ? (
        <>
          <p className="text-green-100 mb-2">
            An M-Pesa prompt has been sent to <strong>{phone}</strong>
          </p>
          <p className="text-green-200 text-sm mb-2">
            Enter your M-Pesa PIN to complete the {isRepay ? 'repayment' : 'deposit'}.
          </p>
          <div className="bg-white bg-opacity-20 rounded-2xl p-4 mb-6">
            <p className="text-green-100 text-xs mb-1">Checkout ID</p>
            <p className="text-white font-mono text-sm">{checkoutId}</p>
          </div>
        </>
      ) : (
        <p className="text-green-100 mb-8">
          KES {Number(amount).toLocaleString()} will be sent to {phone} within minutes.
        </p>
      )}
      <div className="space-y-3 w-full max-w-xs">
        <button onClick={() => navigate('/farmer')}
          className="w-full bg-white text-green-700 font-bold py-4 rounded-2xl text-lg">
          Back to Dashboard
        </button>
        <button onClick={() => { setSuccess(false); setAmount(''); setError('') }}
          className="w-full bg-green-700 bg-opacity-50 text-white font-bold py-3 rounded-2xl">
          Make Another Payment
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`px-5 pt-12 pb-6 ${isWithdraw ? 'bg-gradient-to-br from-blue-800 to-blue-600' : 'bg-gradient-to-br from-green-800 to-green-600'}`}>
        <button onClick={() => navigate('/farmer')}
          className="text-white text-opacity-70 text-sm mb-4 flex items-center gap-2">
          ← Back
        </button>
        <h1 className="text-2xl font-black text-white">{getTitle()} 📱</h1>
        <p className="text-white text-opacity-70 text-sm mt-1">{getDescription()}</p>
      </div>

      <div className="px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-4 text-sm">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
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

            {amount && Number(amount) >= 100 && (
              <div className={`rounded-xl p-4 ${isWithdraw ? 'bg-blue-50 border border-blue-200' : 'bg-green-50 border border-green-200'}`}>
                <p className={`text-sm font-bold ${isWithdraw ? 'text-blue-800' : 'text-green-800'}`}>
                  Payment Summary
                </p>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-gray-600">Amount</span>
                  <span className="font-black">KES {Number(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between mt-1 text-sm">
                  <span className="text-gray-600">Transaction fee</span>
                  <span className="font-medium text-orange-600">KES {Math.ceil(Number(amount) * 0.01)}</span>
                </div>
                <div className="flex justify-between mt-1 text-sm font-black border-t border-gray-200 pt-1">
                  <span>You {isWithdraw ? 'receive' : 'pay'}</span>
                  <span className={isWithdraw ? 'text-blue-600' : 'text-green-600'}>
                    KES {isWithdraw
                      ? (Number(amount) - Math.ceil(Number(amount) * 0.01)).toLocaleString()
                      : (Number(amount) + Math.ceil(Number(amount) * 0.01)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
            <p className="text-xs text-yellow-700">
              ⚠️ <span className="font-bold">Note:</span> A 1% transaction fee applies to all M-Pesa transactions.
              This supports Igembe SACCO operations.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !amount || Number(amount) < 100}
            className={`w-full disabled:opacity-50 text-white font-black py-5 rounded-2xl text-xl shadow-lg flex items-center justify-center gap-2 ${
              isWithdraw ? 'bg-blue-600' : 'bg-green-600'
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing...
              </>
            ) : isWithdraw ? '💸 Withdraw Now' : '📱 Send M-Pesa Prompt'}
          </button>
        </form>
      </div>
    </div>
  )
}