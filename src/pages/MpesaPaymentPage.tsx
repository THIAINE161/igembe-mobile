import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

type Stage = 'input' | 'polling' | 'success' | 'failed'
type PayType = 'deposit' | 'withdraw' | 'repay' | 'harvest-withdraw'

const TITLES: Record<PayType, string> = {
  deposit: '📥 Deposit Savings',
  withdraw: '💸 Withdraw Savings',
  repay: '💰 Repay Loan',
  'harvest-withdraw': '🌿 Harvest Earnings'
}
const DESCRIPTIONS: Record<PayType, string> = {
  deposit: 'Add money to your savings account via M-Pesa.',
  withdraw: 'Withdraw from savings to M-Pesa.',
  repay: 'Repay your loan via M-Pesa.',
  'harvest-withdraw': 'Withdraw harvest earnings to M-Pesa.'
}

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} text-green-600`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function MpesaPaymentPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const { member } = useMobileStore()

  const payType = (sp.get('type') || 'deposit') as PayType
  const loanId = sp.get('loanId') || ''
  const loanNumber = sp.get('loanNumber') || ''
  const accountId = sp.get('accountId') || ''

  const [amount, setAmount] = useState(sp.get('amount') || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<Stage>('input')
  const [checkoutReqId, setCheckoutReqId] = useState('')
  const [resultMsg, setResultMsg] = useState('')
  const [receipt, setReceipt] = useState('')
  const [newBalance, setNewBalance] = useState<number | null>(null)
  const [savBalance, setSavBalance] = useState(0)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollCount = useRef(0)

  useEffect(() => {
    if (!member) { navigate('/login', { replace: true }); return }
    loadBalance()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const loadBalance = async () => {
    if (!member?.id) return
    try {
      const r = await api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      const accs: any[] = r.data?.data?.savingsAccounts || []
      const sav = accs.find((a: any) => a.accountType === 'savings')
      setSavBalance(Number(sav?.balance || 0))
    } catch (_) {}
  }

  const startPolling = (crid: string) => {
    pollCount.current = 0
    pollRef.current = setInterval(async () => {
      pollCount.current++
      // Stop after 2.5 minutes (30 × 5 seconds)
      if (pollCount.current > 30) {
        clearInterval(pollRef.current!)
        setStage('failed')
        setResultMsg('Payment timed out. If money was deducted from M-Pesa, it will be reversed within 24 hours.')
        return
      }
      try {
        const r = await api.get(`/api/mpesa/status/${crid}`)
        const { status, resultCode, resultDesc, receipt: rec } = r.data

        if (status === 'success') {
          clearInterval(pollRef.current!)
          setReceipt(rec || '')
          setStage('success')
          setResultMsg('Payment confirmed! ✅')
          await loadBalance()
        } else if (status === 'failed') {
          clearInterval(pollRef.current!)
          setStage('failed')
          // Friendly messages for common M-Pesa result codes
          const FAIL_MSGS: Record<number, string> = {
            1: 'Insufficient M-Pesa balance.',
            1032: 'Payment was cancelled.',
            1037: 'Timed out — you did not enter your PIN in time.',
            2001: 'Wrong M-Pesa PIN entered.',
            17: 'M-Pesa limit reached. Try a smaller amount.'
          }
          setResultMsg(FAIL_MSGS[resultCode] || resultDesc || 'Payment failed. Please try again.')
        }
        // status === 'pending' → keep polling
      } catch (_) {
        // Network error — keep polling silently
      }
    }, 5000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(amount)

    if (!amt || amt <= 0) { setError('Enter a valid amount'); return }
    if (!member) { setError('Please login first'); return }

    // Pre-validate withdrawal amount
    if ((payType === 'withdraw' || payType === 'harvest-withdraw') && amt > savBalance) {
      setError(`Insufficient balance. Available: KES ${savBalance.toLocaleString()}`)
      return
    }

    setLoading(true)
    setError('')

    try {
      if (payType === 'deposit') {
        const r = await api.post('/api/mpesa/stk-push', {
          phoneNumber: member.phoneNumber,
          amount: amt,
          memberId: member.id
        })
        const crid = r.data?.checkoutRequestId
        if (crid) {
          setCheckoutReqId(crid)
          setStage('polling')
          startPolling(crid)
        } else {
          // Sandbox or immediate response
          setStage('success')
          setResultMsg(r.data?.message || 'Deposit initiated. (Sandbox mode)')
          await loadBalance()
        }

      } else if (payType === 'repay') {
        const r = await api.post('/api/mpesa/loan-repayment', {
          phoneNumber: member.phoneNumber,
          amount: amt,
          memberId: member.id,
          loanId: loanId || undefined,
          loanNumber: loanNumber || undefined
        })
        const crid = r.data?.checkoutRequestId
        if (crid) {
          setCheckoutReqId(crid)
          setStage('polling')
          startPolling(crid)
        } else {
          setStage('success')
          setResultMsg(r.data?.message || 'Repayment initiated. (Sandbox mode)')
        }

      } else {
        // withdraw / harvest-withdraw — no STK push, direct deduction
        const r = await api.post('/api/mpesa/withdraw', {
          memberId: member.id,
          phoneNumber: member.phoneNumber,
          amount: amt,
          accountId: accountId || undefined
        })
        setNewBalance(r.data?.data?.newBalance ?? null)
        setStage('success')
        setResultMsg(r.data?.message || `KES ${amt.toLocaleString()} withdrawn successfully.`)
        await loadBalance()
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Request failed. Check your connection and try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── SUCCESS ────────────────────────────────────────────────────────────────
  if (stage === 'success') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-5xl">✅</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">
          {payType === 'withdraw' || payType === 'harvest-withdraw'
            ? 'Withdrawal Recorded!'
            : 'Payment Confirmed!'}
        </h2>
        <p className="text-gray-600 mb-2 text-sm">{resultMsg}</p>
        {receipt && (
          <p className="text-green-600 text-sm font-bold mb-2">M-Pesa Receipt: {receipt}</p>
        )}
        <div className="bg-green-50 rounded-2xl p-4 mb-5">
          <p className="text-xs text-gray-500">Amount</p>
          <p className="text-3xl font-black text-green-700">KES {Number(amount).toLocaleString()}</p>
          {(payType === 'deposit' || payType === 'withdraw' || payType === 'harvest-withdraw') && (
            <>
              <p className="text-xs text-gray-500 mt-2">Updated Balance</p>
              <p className="text-xl font-bold text-gray-900">
                KES {(newBalance !== null ? newBalance : savBalance).toLocaleString()}
              </p>
            </>
          )}
          {payType === 'repay' && (
            <p className="text-xs text-green-600 mt-2">Your loan balance has been updated.</p>
          )}
        </div>
        <button
          onClick={() => navigate('/farmer')}
          className="w-full bg-green-600 text-white font-black py-3 rounded-2xl mb-2"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => { setStage('input'); setError(''); setAmount('') }}
          className="w-full border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-2xl"
        >
          Make Another Payment
        </button>
      </div>
    </div>
  )

  // ── FAILED ──────────────────────────────────────────────────────────────────
  if (stage === 'failed') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-5xl">❌</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Payment Failed</h2>
        <p className="text-gray-600 mb-6 text-sm">{resultMsg}</p>
        <button
          onClick={() => navigate('/farmer')}
          className="w-full border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-2xl mb-2"
        >
          Back to Dashboard
        </button>
        <button
          onClick={() => { setStage('input'); setError('') }}
          className="w-full bg-green-600 text-white font-black py-3 rounded-2xl"
        >
          Try Again
        </button>
      </div>
    </div>
  )

  // ── POLLING ──────────────────────────────────────────────────────────────────
  if (stage === 'polling') return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Spinner size={10} />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Check Your Phone! 📱</h2>
        <p className="text-gray-600 mb-1">Enter your M-Pesa PIN to complete the payment.</p>
        <p className="text-blue-600 text-sm font-medium mb-4">Waiting for confirmation...</p>
        <div className="bg-blue-50 rounded-2xl p-4 mb-4">
          <p className="text-xs text-gray-500">Amount</p>
          <p className="text-3xl font-black text-blue-700">KES {Number(amount).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Sending to: {member?.phoneNumber}</p>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          This page updates automatically when payment is confirmed. Do not close it.
        </p>
        <button
          onClick={() => {
            if (pollRef.current) clearInterval(pollRef.current)
            setStage('input')
          }}
          className="text-red-400 text-sm underline"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  // ── INPUT FORM ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-8">
        <button onClick={() => navigate(-1)} className="text-green-200 text-sm mb-4 block">
          ← Back
        </button>
        <h1 className="text-white text-2xl font-black">{TITLES[payType]}</h1>
        <p className="text-green-200 text-sm mt-1">{DESCRIPTIONS[payType]}</p>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex items-start justify-between gap-2">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="font-bold text-red-700 flex-shrink-0">×</button>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-sm p-5">
          {/* Balance info */}
          {(payType === 'deposit' || payType === 'withdraw') && (
            <div className="bg-green-50 rounded-2xl p-4 mb-5">
              <p className="text-xs text-gray-500">Your Savings Balance</p>
              <p className="text-2xl font-black text-green-700">KES {savBalance.toLocaleString()}</p>
            </div>
          )}

          {payType === 'repay' && loanNumber && (
            <div className="bg-orange-50 rounded-2xl p-4 mb-5">
              <p className="text-xs text-gray-500">Repaying Loan</p>
              <p className="text-lg font-black text-orange-700">{loanNumber}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Amount (KES) *</label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                inputMode="numeric"
                required
                className="w-full px-4 py-5 border-2 border-gray-200 rounded-2xl text-4xl font-black text-center focus:outline-none focus:border-green-500 bg-gray-50"
              />
            </div>

            {/* Quick amount presets */}
            <div className="grid grid-cols-4 gap-2">
              {[500, 1000, 2000, 5000].map(v => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    Number(amount) === v
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {v >= 1000 ? `${v / 1000}K` : v}
                </button>
              ))}
            </div>

            {/* Withdrawal warning */}
            {(payType === 'withdraw' || payType === 'harvest-withdraw') && Number(amount) > savBalance && Number(amount) > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                <p className="text-red-700 text-sm font-medium">
                  ⚠️ Amount exceeds balance. Max available: KES {savBalance.toLocaleString()}
                </p>
              </div>
            )}

            {/* Sender info */}
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs font-bold text-gray-500 mb-1">
                {payType === 'deposit' || payType === 'repay' ? 'M-Pesa prompt to:' : 'Sending to M-Pesa:'}
              </p>
              <p className="font-bold text-gray-900">{member?.fullName}</p>
              <p className="text-gray-600 text-sm">{member?.phoneNumber}</p>
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !amount ||
                Number(amount) <= 0 ||
                ((payType === 'withdraw' || payType === 'harvest-withdraw') && Number(amount) > savBalance)
              }
              className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-5 rounded-2xl text-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <><Spinner size={6} /> Processing...</>
              ) : payType === 'withdraw' || payType === 'harvest-withdraw' ? (
                `💸 Withdraw KES ${Number(amount || 0).toLocaleString()}`
              ) : (
                `📱 Send M-Pesa Prompt`
              )}
            </button>
          </form>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-xs font-bold text-blue-800 mb-1">ℹ️ How it works</p>
          <p className="text-xs text-blue-700">
            {payType === 'deposit' || payType === 'repay'
              ? 'You will receive an M-Pesa prompt on your phone. Enter your PIN and the payment is automatically confirmed in the app within 30 seconds.'
              : 'Your savings balance is updated immediately and money is sent to your M-Pesa. May take a few minutes to arrive.'}
          </p>
        </div>
      </div>
    </div>
  )
}