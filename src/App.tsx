import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useMobileStore } from './store/mobileStore'
import MobileLoginPage from './pages/MobileLoginPage'
import ForgotPinPage from './pages/ForgotPinPage'
import RoleSelectPage from './pages/RoleSelectPage'
import FarmerDashboard from './pages/FarmerDashboard'
import DriverDashboard from './pages/DriverDashboard'
import NewHarvestMobilePage from './pages/NewHarvestMobilePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useMobileStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<MobileLoginPage />} />
        <Route path="/forgot-pin" element={<ForgotPinPage />} />
        <Route path="/select-role" element={
          <ProtectedRoute><RoleSelectPage /></ProtectedRoute>
        } />
        <Route path="/farmer" element={
          <ProtectedRoute><FarmerDashboard /></ProtectedRoute>
        } />
        <Route path="/farmer/harvest/new" element={
          <ProtectedRoute><NewHarvestMobilePage /></ProtectedRoute>
        } />
        <Route path="/driver" element={
          <ProtectedRoute><DriverDashboard /></ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App