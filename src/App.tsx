import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useMobileStore } from './store/mobileStore'

// ── Always-needed pages (eager import) ───────────────────────────────────────
import MobileLoginPage from './pages/MobileLoginPage'
import ForgotPinPage from './pages/ForgotPinPage'

// ── Lazy-loaded pages (only loaded when visited) ──────────────────────────────
const FarmerDashboard    = lazy(() => import('./pages/FarmerDashboard'))
const MpesaPaymentPage   = lazy(() => import('./pages/MpesaPaymentPage'))
const HarvestSchedulePage = lazy(() => import('./pages/HarvestSchedulePage'))
const HarvestEditPage    = lazy(() => import('./pages/HarvestEditPage'))
const LoanApplicationPage = lazy(() => import('./pages/LoanApplicationPage'))
const AgrovetOrderPage   = lazy(() => import('./pages/AgrovetOrderPage'))
const AgentDashboard     = lazy(() => import('./pages/AgentDashboard'))
const ResetPinPage       = lazy(() => import('./pages/ResetPinPage'))

// ── Connection status widget ──────────────────────────────────────────────────
import ConnectionStatus from './components/ConnectionStatus'

// ── Loading spinner shown while lazy pages load ───────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-16 h-16 bg-green-600 rounded-3xl flex items-center justify-center shadow-xl">
        <span className="text-white text-2xl font-black">IG</span>
      </div>
      <svg
        className="animate-spin h-8 w-8 text-green-600"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )
}

// ── ProtectedRoute — redirects if not authenticated ───────────────────────────
function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole?: 'farmer' | 'agent'
}) {
  const { token, roles } = useMobileStore()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    if (roles.includes('agent'))  return <Navigate to="/agent"  replace />
    if (roles.includes('farmer')) return <Navigate to="/farmer" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ── Smart redirect based on user's role ───────────────────────────────────────
function RoleRedirect() {
  const { token, roles } = useMobileStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles.includes('farmer')) return <Navigate to="/farmer" replace />
  if (roles.includes('agent'))  return <Navigate to="/agent"  replace />
  return <Navigate to="/login" replace />
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* Default root — redirect by role */}
          <Route path="/" element={<RoleRedirect />} />

          {/* ── Public auth pages ─────────────────────────────────────────── */}
          <Route path="/login"      element={<MobileLoginPage />} />
          <Route path="/forgot-pin" element={<ForgotPinPage />} />
          <Route path="/reset-pin"  element={<ResetPinPage />} />

          {/* ── Farmer pages ─────────────────────────────────────────────── */}

          {/* Main farmer dashboard */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute requiredRole="farmer">
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />

          {/* M-Pesa payments
              Usage:
              /farmer/mpesa?type=deposit
              /farmer/mpesa?type=withdraw
              /farmer/mpesa?type=repay&loanId=xxx&loanNumber=LN-0001
          */}
          <Route
            path="/farmer/mpesa"
            element={
              <ProtectedRoute requiredRole="farmer">
                <MpesaPaymentPage />
              </ProtectedRoute>
            }
          />

          {/* Schedule a new harvest pickup */}
          <Route
            path="/farmer/harvest/schedule"
            element={
              <ProtectedRoute requiredRole="farmer">
                <HarvestSchedulePage />
              </ProtectedRoute>
            }
          />

          {/* Edit an existing harvest (only scheduled/confirmed) */}
          <Route
            path="/farmer/harvest/:id/edit"
            element={
              <ProtectedRoute requiredRole="farmer">
                <HarvestEditPage />
              </ProtectedRoute>
            }
          />

          {/* Digital loan application */}
          <Route
            path="/farmer/loan/apply"
            element={
              <ProtectedRoute requiredRole="farmer">
                <LoanApplicationPage />
              </ProtectedRoute>
            }
          />

          {/* AgroVet shop */}
          <Route
            path="/farmer/agrovet"
            element={
              <ProtectedRoute requiredRole="farmer">
                <AgrovetOrderPage />
              </ProtectedRoute>
            }
          />

          {/* ── Agent pages ──────────────────────────────────────────────── */}

          {/* Agent dashboard */}
          <Route
            path="/agent"
            element={
              <ProtectedRoute requiredRole="agent">
                <AgentDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all ────────────────────────────────────────────────── */}
          <Route path="*" element={<RoleRedirect />} />

        </Routes>
      </Suspense>

      {/* Connection status — fixed bottom-right, only visible when offline */}
      <ConnectionStatus />
    </Router>
  )
}