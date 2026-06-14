import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

interface Eligibility {
  loanScore: number
  maxLoanAmount: number
  recommendation: string
  hasActiveLoan: boolean
  activeLoan?: { loanNumber: string; status: string } | null
  eligible: boolean
}

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// Compress image to base64 string (under 500KB)
async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 800
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.65))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ImageUploadField({
  label,
  value,
  onCapture,
  required = false
}: {
  label: string
  value: string | null
  onCapture: (base64: string) => void
  required?: boolean
}) {
  const [uploading, setUploading] = useState(false)

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const compressed = await compressImage(file)
      onCapture(compressed)
    } catch (err) {
      console.error('Image compression error:', err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt={label}
            className="w-full h-36 object-cover rounded-xl border-2 border-green-300"
          />
          <button
            type="button"
            onClick={() => onCapture('')}
            className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-sm font-bold flex items-center justify-center"
          >
            ×
          </button>
          <div className="absolute bottom-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded-lg font-bold">
            ✓ Uploaded
          </div>
        </div>
      ) : (
        <label className="block cursor-pointer">
          <div className="w-full h-36 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-green-500 hover:bg-green-50 transition-colors bg-gray-50">
            {uploading ? (
              <><Spinner size={6} /><p className="text-xs text-gray-500">Uploading...</p></>
            ) : (
              <>
                <span className="text-3xl">📷</span>
                <p className="text-xs text-gray-600 font-medium">Tap to take photo or upload</p>
                <p className="text-xs text-gray-400">JPG, PNG accepted</p>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      )}
    </div>
  )
}

const INTEREST_RATE = 12 // 12% per annum
const PURPOSES = [
  'Farm inputs (fertilizer, pesticides)',
  'Expand miraa farm',
  'Purchase farm equipment',
  'Education fees',
  'Medical expenses',
  'Business capital',
  'Home improvement',
  'Other'
]
const TERM_OPTIONS = [3, 6, 12, 18, 24, 36]
const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Colleague', 'Neighbour', 'Other']

export default function LoanApplicationPage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()

  const [step, setStep] = useState(1)
  const [eligibilityLoading, setEligibilityLoading] = useState(true)
  const [eligibility, setEligibility] = useState<Eligibility | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submittedLoan, setSubmittedLoan] = useState<any>(null)

  // Step 1: Loan details
  const [principalAmount, setPrincipalAmount] = useState('')
  const [termMonths, setTermMonths] = useState(12)
  const [purpose, setPurpose] = useState('')
  const [customPurpose, setCustomPurpose] = useState('')

  // Step 2: Your National ID
  const [nationalIdFront, setNationalIdFront] = useState<string | null>(null)
  const [nationalIdBack, setNationalIdBack] = useState<string | null>(null)

  // Step 3: Guarantor
  const [guarantorName, setGuarantorName] = useState('')
  const [guarantorPhone, setGuarantorPhone] = useState('')
  const [guarantorRelationship, setGuarantorRelationship] = useState('')
  const [guarantorNationalId, setGuarantorNationalId] = useState('')
  const [guarantorIdFront, setGuarantorIdFront] = useState<string | null>(null)
  const [guarantorIdBack, setGuarantorIdBack] = useState<string | null>(null)

  useEffect(() => {
    if (!member) { navigate('/login', { replace: true }); return }
    checkEligibility()
  }, [])

  const checkEligibility = async () => {
    if (!member?.id) return
    try {
      const r = await api.get(`/api/loans/eligibility/${member.id}`)
      setEligibility(r.data.data)
    } catch (err: any) {
      console.error('Eligibility check error:', err.message)
      // If endpoint doesn't exist yet, create a basic eligibility
      setEligibility({
        loanScore: member.loanScore || 20,
        maxLoanAmount: member.maxLoanAmount || 50000,
        recommendation: 'Based on your profile, you may apply for a loan.',
        hasActiveLoan: false,
        eligible: true
      })
    } finally {
      setEligibilityLoading(false)
    }
  }

  // Loan calculation
  const P = Number(principalAmount) || 0
  const n = termMonths
  const r = INTEREST_RATE / 100 / 12
  const monthly = P > 0
    ? (r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
    : 0
  const totalPayable = monthly * n
  const totalInterest = totalPayable - P

  const validateStep1 = () => {
    if (!P || P <= 0) { setError('Enter a valid loan amount'); return false }
    if (eligibility && P > eligibility.maxLoanAmount) {
      setError(`Amount exceeds your limit of KES ${eligibility.maxLoanAmount.toLocaleString()}`)
      return false
    }
    if (P < 1000) { setError('Minimum loan amount is KES 1,000'); return false }
    if (!purpose) { setError('Select a loan purpose'); return false }
    if (purpose === 'Other' && !customPurpose.trim()) { setError('Describe your loan purpose'); return false }
    return true
  }

  const validateStep2 = () => {
    if (!nationalIdFront) { setError('Upload the front of your National ID'); return false }
    if (!nationalIdBack) { setError('Upload the back of your National ID'); return false }
    return true
  }

  const validateStep3 = () => {
    if (!guarantorName.trim()) { setError('Enter guarantor name'); return false }
    if (!guarantorPhone.trim()) { setError('Enter guarantor phone number'); return false }
    if (!/^0[0-9]{9}$/.test(guarantorPhone.replace(/\s/g, ''))) {
      setError('Enter a valid guarantor phone number (e.g. 0712345678)')
      return false
    }
    if (!guarantorRelationship) { setError('Select your relationship with guarantor'); return false }
    if (!guarantorIdFront) { setError('Upload the front of guarantor National ID'); return false }
    return true
  }

  const handleNext = () => {
    setError('')
    if (step === 1 && !validateStep1()) return
    if (step === 2 && !validateStep2()) return
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setError('')
    if (!validateStep3()) return
    if (!member) return

    setSubmitting(true)
    try {
      const finalPurpose = purpose === 'Other' ? customPurpose : purpose

      // Create loan application
      const loanRes = await api.post('/api/loans', {
        memberId: member.id,
        principalAmount: P,
        interestRate: INTEREST_RATE,
        termMonths: n,
        purpose: finalPurpose,
        notes: `Digital application via app. Guarantor: ${guarantorName} (${guarantorPhone}, ${guarantorRelationship}).`
      })

      const loanId = loanRes.data.data?.id
      const loanNumber = loanRes.data.data?.loanNumber

      // Save application documents
      try {
        await api.post('/api/loans/application', {
          memberId: member.id,
          loanId: loanId || null,
          nationalIdFrontUrl: nationalIdFront,
          nationalIdBackUrl: nationalIdBack,
          guarantorName: guarantorName.trim(),
          guarantorPhone: guarantorPhone.trim(),
          guarantorRelationship,
          guarantorNationalId: guarantorNationalId.trim() || null,
          guarantorIdFrontUrl: guarantorIdFront,
          guarantorIdBackUrl: guarantorIdBack || null
        })
      } catch (docErr: any) {
        console.error('Document upload error:', docErr.message)
        // Non-fatal — loan was created, documents can be re-submitted
      }

      setSubmittedLoan({ loanNumber, amount: P, term: n, monthly: Math.round(monthly) })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Redirect if not logged in ─────────────────────────────────────────────
  if (!member) return null

  // ── Loading eligibility ───────────────────────────────────────────────────
  if (eligibilityLoading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
      <Spinner size={8} />
      <p className="text-gray-500">Checking eligibility...</p>
    </div>
  )

  // ── SUCCESS ───────────────────────────────────────────────────────────────
  if (submittedLoan) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-5xl">🎉</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900">Application Submitted!</h2>
          <p className="text-gray-500 text-sm mt-1">Your loan application is under review.</p>
        </div>

        <div className="bg-green-50 rounded-2xl p-4 mb-5 space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Loan Number</span>
            <span className="font-black text-green-700">{submittedLoan.loanNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Amount</span>
            <span className="font-bold">KES {submittedLoan.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Term</span>
            <span className="font-bold">{submittedLoan.term} months</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Monthly Payment</span>
            <span className="font-bold text-orange-600">KES {submittedLoan.monthly.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-blue-50 rounded-2xl p-4 mb-5">
          <p className="text-xs font-bold text-blue-800 mb-2">⏱️ What happens next?</p>
          <div className="space-y-1.5">
            {[
              'SACCO reviews your application (1–3 business days)',
              'You receive SMS notification of decision',
              'If approved, funds disbursed to your M-Pesa',
              'Repay monthly via M-Pesa using your loan number'
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-blue-700">
                <span className="w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center font-black flex-shrink-0 text-xs">
                  {i + 1}
                </span>
                {s}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => navigate('/farmer')}
          className="w-full bg-green-600 text-white font-black py-3 rounded-2xl"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )

  // ── Ineligible ────────────────────────────────────────────────────────────
  if (eligibility?.hasActiveLoan) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-green-200 text-sm mb-4 block">← Back</button>
        <h1 className="text-white text-xl font-black">💰 Loan Application</h1>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-sm text-center">
          <span className="text-5xl block mb-4">🚫</span>
          <h2 className="text-xl font-black text-gray-900 mb-2">Cannot Apply</h2>
          <p className="text-gray-500 text-sm mb-3">
            You already have an active loan:
            <br /><strong className="text-orange-600">{eligibility.activeLoan?.loanNumber}</strong>
            <br /><span className="capitalize">{eligibility.activeLoan?.status}</span>
          </p>
          <p className="text-gray-400 text-xs mb-5">
            You can apply for a new loan after fully repaying your current loan.
          </p>
          <button
            onClick={() => navigate('/farmer')}
            className="w-full bg-green-600 text-white font-black py-3 rounded-2xl"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )

  // ── MAIN APPLICATION FORM ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-5">
        <button
          onClick={() => step > 1 ? setStep(s => s - 1) : navigate(-1)}
          className="text-green-200 text-sm mb-4 block"
        >
          ← {step > 1 ? 'Back' : 'Cancel'}
        </button>
        <h1 className="text-white text-xl font-black">💰 Loan Application</h1>
        <p className="text-green-200 text-sm mt-1">Step {step} of 3</p>

        {/* Progress bar */}
        <div className="flex gap-1.5 mt-3">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white bg-opacity-30'}`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 py-5 space-y-4 max-w-lg mx-auto pb-20">
        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between items-start gap-2">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="font-bold flex-shrink-0">×</button>
          </div>
        )}

        {/* Eligibility summary */}
        {eligibility && !eligibility.hasActiveLoan && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-bold text-gray-700">Your Loan Score</p>
              <span className="font-black text-green-700">{eligibility.loanScore}/100</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${Math.min(100, eligibility.loanScore)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Max eligible: <span className="font-bold text-green-600">KES {eligibility.maxLoanAmount.toLocaleString()}</span>
            </p>
          </div>
        )}

        {/* ── STEP 1: Loan details ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <h3 className="font-black text-gray-900">Loan Details</h3>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Loan Amount (KES) *
                </label>
                <input
                  type="number"
                  value={principalAmount}
                  onChange={e => setPrincipalAmount(e.target.value)}
                  placeholder={`Min: 1,000 · Max: ${(eligibility?.maxLoanAmount || 50000).toLocaleString()}`}
                  min="1000"
                  max={eligibility?.maxLoanAmount || 500000}
                  inputMode="numeric"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-black text-center focus:outline-none focus:border-green-500 bg-gray-50"
                />
                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {[5000, 10000, 20000, 50000].filter(v => v <= (eligibility?.maxLoanAmount || 500000)).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPrincipalAmount(String(v))}
                      className={`py-2 rounded-xl text-xs font-bold ${Number(principalAmount) === v ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {v >= 1000 ? `${v / 1000}K` : v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Repayment Period
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TERM_OPTIONS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTermMonths(t)}
                      className={`py-2.5 rounded-xl text-sm font-bold ${termMonths === t ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                      {t} mo
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Purpose of Loan *
                </label>
                <select
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
                >
                  <option value="">Select purpose...</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {purpose === 'Other' && (
                  <input
                    type="text"
                    value={customPurpose}
                    onChange={e => setCustomPurpose(e.target.value)}
                    placeholder="Describe your purpose..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm mt-2"
                  />
                )}
              </div>

              {/* Loan summary */}
              {P > 0 && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                  <p className="text-xs font-bold text-green-800 mb-3">📊 Loan Summary</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Principal Amount', value: `KES ${P.toLocaleString()}` },
                      { label: 'Interest Rate', value: `${INTEREST_RATE}% per annum` },
                      { label: 'Monthly Payment', value: `KES ${Math.round(monthly).toLocaleString()}` },
                      { label: 'Repayment Period', value: `${n} months` },
                      { label: 'Total Interest', value: `KES ${Math.round(totalInterest).toLocaleString()}` },
                      { label: 'Total Payable', value: `KES ${Math.round(totalPayable).toLocaleString()}` },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between text-sm">
                        <span className="text-gray-500">{row.label}</span>
                        <span className="font-bold text-gray-900">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-lg"
            >
              Next → Upload Documents
            </button>
          </div>
        )}

        {/* ── STEP 2: Your National ID ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-5">
              <h3 className="font-black text-gray-900">Your National ID</h3>
              <p className="text-sm text-gray-500">
                Take clear photos of both sides of your National ID. Ensure the text is readable.
              </p>

              <ImageUploadField
                label="National ID — Front Side"
                value={nationalIdFront}
                onCapture={setNationalIdFront}
                required
              />

              <ImageUploadField
                label="National ID — Back Side"
                value={nationalIdBack}
                onCapture={setNationalIdBack}
                required
              />
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-lg"
            >
              Next → Guarantor Details
            </button>
          </div>
        )}

        {/* ── STEP 3: Guarantor ────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <h3 className="font-black text-gray-900">Guarantor Information</h3>
              <p className="text-sm text-gray-500">
                Your guarantor must be a registered Igembe SACCO member or an Igembe community member who can vouch for you.
              </p>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Guarantor Full Name *</label>
                <input
                  type="text"
                  value={guarantorName}
                  onChange={e => setGuarantorName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Guarantor Phone *</label>
                <input
                  type="tel"
                  value={guarantorPhone}
                  onChange={e => setGuarantorPhone(e.target.value)}
                  placeholder="0712 345 678"
                  inputMode="numeric"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Relationship *</label>
                <select
                  value={guarantorRelationship}
                  onChange={e => setGuarantorRelationship(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
                >
                  <option value="">Select relationship...</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Guarantor National ID No. (optional)</label>
                <input
                  type="text"
                  value={guarantorNationalId}
                  onChange={e => setGuarantorNationalId(e.target.value)}
                  placeholder="e.g. 12345678"
                  inputMode="numeric"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-green-500 bg-gray-50 text-sm"
                />
              </div>

              <ImageUploadField
                label="Guarantor National ID — Front *"
                value={guarantorIdFront}
                onCapture={setGuarantorIdFront}
                required
              />

              <ImageUploadField
                label="Guarantor National ID — Back (optional)"
                value={guarantorIdBack}
                onCapture={(v) => setGuarantorIdBack(v || null)}
              />
            </div>

            {/* Final summary before submit */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 mb-2">📋 Application Summary</p>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex justify-between"><span>Amount</span><span className="font-bold">KES {P.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Monthly</span><span className="font-bold">KES {Math.round(monthly).toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Term</span><span className="font-bold">{n} months</span></div>
                <div className="flex justify-between"><span>Purpose</span><span className="font-bold">{purpose === 'Other' ? customPurpose : purpose}</span></div>
                <div className="flex justify-between"><span>Guarantor</span><span className="font-bold">{guarantorName || '—'}</span></div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-3">
              <p className="text-xs text-yellow-800">
                ⚠️ By submitting, you confirm that all information provided is accurate and that you agree to repay the loan as per the schedule above.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
            >
              {submitting ? <><Spinner size={5} /> Submitting...</> : '✅ Submit Application'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}