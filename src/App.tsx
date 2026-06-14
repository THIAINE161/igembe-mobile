import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useMobileStore } from './store/mobileStore'

// ── Eager imports (always needed) ────────────────────────────────────────────
import MobileLoginPage from './pages/MobileLoginPage'
import ForgotPinPage from './pages/ForgotPinPage'

// ── Lazy imports (loaded only when needed) ────────────────────────────────────
const FarmerDashboard = lazy(() => import('./pages/FarmerDashboard'))
const MpesaPaymentPage = lazy(() => import('./pages/MpesaPaymentPage'))
const HarvestSchedulePage = lazy(() => import('./pages/HarvestSchedulePage'))
const HarvestEditPage = lazy(() => import('./pages/HarvestEditPage'))
const LoanApplicationPage = lazy(() => import('./pages/LoanApplicationPage'))
const AgrovetOrderPage = lazy(() => import('./pages/AgrovetOrderPage'))
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'))
const ResetPinPage = lazy(() => import('./pages/ResetPinPage'))

// ── Connection status (fixed bottom-right, always shown) ─────────────────────
import ConnectionStatus from './components/ConnectionStatus'

// ── Loading screen ────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-green-600 rounded-3xl flex items-center justify-center mb-4 shadow-xl">
        <span className="text-white text-2xl font-black">IG</span>
      </div>
      <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}

// ── Protected route wrapper ───────────────────────────────────────────────────
function ProtectedRoute({
  children,
  requiredRole
}: {
  children: React.ReactNode
  requiredRole?: 'farmer' | 'agent'
}) {
  const { token, roles } = useMobileStore()

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    // Redirect to appropriate dashboard
    if (roles.includes('agent')) return <Navigate to="/agent" replace />
    if (roles.includes('farmer')) return <Navigate to="/farmer" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ── Smart redirect based on user role ────────────────────────────────────────
function RoleRedirect() {
  const { token, roles } = useMobileStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles.includes('farmer')) return <Navigate to="/farmer" replace />
  if (roles.includes('agent')) return <Navigate to="/agent" replace />
  return <Navigate to="/login" replace />
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>

          {/* Default — redirect based on role */}
          <Route path="/" element={<RoleRedirect />} />

          {/* Auth routes — no protection */}
          <Route path="/login" element={<MobileLoginPage />} />
          <Route path="/forgot-pin" element={<ForgotPinPage />} />
          <Route path="/reset-pin" element={<ResetPinPage />} />

          {/* ── Farmer routes ─────────────────────────────────────────────── */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute requiredRole="farmer">
                <FarmerDashboard />
              </ProtectedRoute>
            }
          />

          {/* M-Pesa payments: /farmer/mpesa?type=deposit|withdraw|repay */}
          <Route
            path="/farmer/mpesa"
            element={
              <ProtectedRoute requiredRole="farmer">
                <MpesaPaymentPage />
              </ProtectedRoute>
            }
          />

          {/* Schedule harvest pickup */}
          <Route
            path="/farmer/harvest/schedule"
            element={
              <ProtectedRoute requiredRole="farmer">
                <HarvestSchedulePage />
              </ProtectedRoute>
            }
          />

          {/* Edit scheduled/confirmed harvest */}
          <Route
            path="/farmer/harvest/:id/edit"
            element={
              <ProtectedRoute requiredRole="farmer">
                <HarvestEditPage />
              </ProtectedRoute>
            }
          />

          {/* Apply for loan digitally */}
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

          {/* ── Agent routes ──────────────────────────────────────────────── */}
          <Route
            path="/agent"
            element={
              <ProtectedRoute requiredRole="agent">
                <AgentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all — redirect based on role */}
          <Route path="*" element={<RoleRedirect />} />

        </Routes>
      </Suspense>

      {/* Global connection status indicator */}
      <ConnectionStatus />
    </Router>
  )
}