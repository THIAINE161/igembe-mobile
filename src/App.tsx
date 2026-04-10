import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Component, ReactNode } from 'react'
import { useMobileStore } from './store/mobileStore'
import MobileLoginPage from './pages/MobileLoginPage'
import ForgotPinPage from './pages/ForgotPinPage'
import RoleSelectPage from './pages/RoleSelectPage'
import FarmerDashboard from './pages/FarmerDashboard'
import DriverDashboard from './pages/DriverDashboard'
import NewHarvestMobilePage from './pages/NewHarvestMobilePage'
import ProfilePage from './pages/ProfilePage'
import AgrovetOrderPage from './pages/AgrovetOrderPage'
import HarvestInvoiceMobilePage from './pages/HarvestInvoiceMobilePage'

// Error boundary to catch crashes
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: '' }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.message || 'Unknown error' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm text-center max-w-sm w-full">
            <p className="text-5xl mb-4">⚠️</p>
            <h2 className="text-xl font-black text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-2">{this.state.error}</p>
            <p className="text-gray-400 text-xs mb-6">Please try again or contact support.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: '' })
                window.location.href = '/login'
              }}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-2xl"
            >
              Go Back to Login
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useMobileStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<MobileLoginPage />} />
          <Route path="/forgot-pin" element={<ForgotPinPage />} />
          <Route path="/select-role" element={<ProtectedRoute><RoleSelectPage /></ProtectedRoute>} />
          <Route path="/farmer" element={<ProtectedRoute><ErrorBoundary><FarmerDashboard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/farmer/harvest/new" element={<ProtectedRoute><NewHarvestMobilePage /></ProtectedRoute>} />
          <Route path="/farmer/harvest/:id/invoice" element={<ProtectedRoute><HarvestInvoiceMobilePage /></ProtectedRoute>} />
          <Route path="/farmer/agrovet" element={<ProtectedRoute><AgrovetOrderPage /></ProtectedRoute>} />
          <Route path="/farmer/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/driver" element={<ProtectedRoute><ErrorBoundary><DriverDashboard /></ErrorBoundary></ProtectedRoute>} />
          <Route path="/driver/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App