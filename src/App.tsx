import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useMobileStore } from './store/mobileStore'

// Auth pages
import MobileLoginPage from './pages/MobileLoginPage'
import ForgotPinPage from './pages/ForgotPinPage'
import ResetPinPage from './pages/ResetPinPage'

// Farmer pages
import FarmerDashboard from './pages/FarmerDashboard'
import MpesaPaymentPage from './pages/MpesaPaymentPage'
import HarvestSchedulePage from './pages/HarvestSchedulePage'
import HarvestEditPage from './pages/HarvestEditPage'
import LoanApplicationPage from './pages/LoanApplicationPage'
import AgrovetOrderPage from './pages/AgrovetOrderPage'

// Agent pages
import AgentDashboard from './pages/AgentDashboard'

// Shared
import ConnectionStatus from './components/ConnectionStatus'

// ─── Protected Route Wrapper ─────────────────────────────────────────────────
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
    // Redirect agent to agent dashboard, farmer to farmer dashboard
    if (roles.includes('agent')) return <Navigate to="/agent" replace />
    if (roles.includes('farmer')) return <Navigate to="/farmer" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// ─── Role-based default redirect ─────────────────────────────────────────────
function RoleRedirect() {
  const { token, roles } = useMobileStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles.includes('farmer')) return <Navigate to="/farmer" replace />
  if (roles.includes('agent')) return <Navigate to="/agent" replace />
  return <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Router>
      <Routes>

        {/* ── Default redirect ──────────────────────────────────────────── */}
        <Route path="/" element={<RoleRedirect />} />

        {/* ── Auth routes (no protection needed) ───────────────────────── */}
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

        {/* M-Pesa payments — deposit, withdraw, repay loan */}
        <Route
          path="/farmer/mpesa"
          element={
            <ProtectedRoute requiredRole="farmer">
              <MpesaPaymentPage />
            </ProtectedRoute>
          }
        />

        {/* Schedule a new harvest */}
        <Route
          path="/farmer/harvest/schedule"
          element={
            <ProtectedRoute requiredRole="farmer">
              <HarvestSchedulePage />
            </ProtectedRoute>
          }
        />

        {/* Edit an existing harvest */}
        <Route
          path="/farmer/harvest/:id/edit"
          element={
            <ProtectedRoute requiredRole="farmer">
              <HarvestEditPage />
            </ProtectedRoute>
          }
        />

        {/* Apply for a loan digitally */}
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

        {/* Catch-all redirect */}
        <Route path="*" element={<RoleRedirect />} />

      </Routes>

      {/* Connection status indicator — fixed bottom right, only shows when offline */}
      <ConnectionStatus />
    </Router>
  )
}