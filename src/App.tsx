import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component } from 'react'
import { useMobileStore } from './store/mobileStore'

// Pages
import MobileLoginPage from './pages/MobileLoginPage'
import ForgotPinPage from './pages/ForgotPinPage'
import RoleSelectPage from './pages/RoleSelectPage'
import FarmerDashboard from './pages/FarmerDashboard'
import AgentDashboard from './pages/AgentDashboard'
import NewHarvestMobilePage from './pages/NewHarvestMobilePage'
import ProfilePage from './pages/ProfilePage'
import AgrovetOrderPage from './pages/AgrovetOrderPage'
import HarvestInvoiceMobilePage from './pages/HarvestInvoiceMobilePage'
import MpesaPaymentPage from './pages/MpesaPaymentPage'
import NotificationsPage from './pages/NotificationsPage'

// ================= ERROR BOUNDARY =================
class ErrorBoundary extends Component<any, { hasError: boolean; error: string }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error?.message || 'Unknown error' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center max-w-sm w-full">
            <p className="text-5xl mb-4">⚠️</p>

            <h2 className="text-xl font-black text-gray-900 mb-2">
              Something went wrong
            </h2>

            <p className="text-gray-400 text-xs mb-6 font-mono bg-gray-100 p-2 rounded break-all">
              {this.state.error}
            </p>

            <button
              onClick={() => {
                this.setState({ hasError: false, error: '' })
                window.location.href = '/login'
              }}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-2xl"
            >
              Back to Login
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// ================= PROTECTED ROUTE =================
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useMobileStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// ================= APP =================
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>

          {/* ================= AUTH ================= */}
          <Route path="/login" element={<MobileLoginPage />} />
          <Route path="/forgot-pin" element={<ForgotPinPage />} />

          <Route
            path="/select-role"
            element={
              <ProtectedRoute>
                <RoleSelectPage />
              </ProtectedRoute>
            }
          />

          {/* ================= FARMER ================= */}
          <Route
            path="/farmer"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <FarmerDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/farmer/harvest/new"
            element={
              <ProtectedRoute>
                <NewHarvestMobilePage />
              </ProtectedRoute>
            }
          />

          {/* ✅ INVOICE ROUTE (CONFIRMED CORRECT) */}
          <Route
            path="/farmer/harvest/:id/invoice"
            element={
              <ProtectedRoute>
                <HarvestInvoiceMobilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/farmer/agrovet"
            element={
              <ProtectedRoute>
                <AgrovetOrderPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/farmer/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/farmer/mpesa/:type"
            element={
              <ProtectedRoute>
                <MpesaPaymentPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/farmer/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* ================= AGENT ================= */}
          <Route
            path="/agent"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <AgentDashboard />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />

          <Route
            path="/agent/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/agent/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* ================= LEGACY ================= */}
          <Route path="/driver" element={<Navigate to="/agent" replace />} />
          <Route path="/driver/profile" element={<Navigate to="/agent/profile" replace />} />

          {/* ================= DEFAULT ================= */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App