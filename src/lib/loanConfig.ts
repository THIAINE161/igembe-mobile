// ─── Shared loan math constants ──────────────────────────────────────────────
// Single source of truth for the reducing-balance loan formula used by both
// LoanApplicationPage and LoanCalculatorPage, so the two can never drift apart.
// Mirrors the backend's own calculation in src/routes/loans.ts (POST /).

export const INTEREST_RATE = 12 // % per annum, reducing balance
export const TERM_OPTIONS = [3, 6, 12, 18, 24, 36]
export const MIN_LOAN_AMOUNT = 1000
export const MAX_LOAN_AMOUNT = 500000

export interface LoanFigures {
  monthly: number
  totalPayable: number
  totalInterest: number
}

export function computeLoanFigures(principal: number, termMonths: number, annualRatePct = INTEREST_RATE): LoanFigures {
  const P = Math.max(0, principal)
  const n = Math.max(1, termMonths)
  const r = annualRatePct / 100 / 12
  const monthly = P > 0
    ? (r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
    : 0
  const totalPayable = monthly * n
  const totalInterest = totalPayable - P
  return { monthly, totalPayable, totalInterest }
}

export interface AmortizationRow {
  month: number
  payment: number
  principalPaid: number
  interestPaid: number
  balance: number
}

// Month-by-month reducing-balance schedule.
export function buildAmortizationSchedule(principal: number, termMonths: number, annualRatePct = INTEREST_RATE): AmortizationRow[] {
  const P = Math.max(0, principal)
  const n = Math.max(1, termMonths)
  const r = annualRatePct / 100 / 12
  const { monthly } = computeLoanFigures(P, n, annualRatePct)

  const rows: AmortizationRow[] = []
  let balance = P
  for (let m = 1; m <= n; m++) {
    const interestPaid = balance * r
    let principalPaid = monthly - interestPaid
    if (m === n) principalPaid = balance // last row clears any rounding remainder
    balance = Math.max(0, balance - principalPaid)
    rows.push({ month: m, payment: monthly, principalPaid, interestPaid, balance })
  }
  return rows
}

// The SACCO's real loan-score → max-amount tiers (mirrors computeLoanScore in
// src/routes/loans.ts on the backend exactly).
export const LOAN_SCORE_TIERS = [
  { minScore: 0,  maxAmount: 20000 },
  { minScore: 20, maxAmount: 50000 },
  { minScore: 40, maxAmount: 100000 },
  { minScore: 60, maxAmount: 200000 },
  { minScore: 80, maxAmount: 500000 },
]
