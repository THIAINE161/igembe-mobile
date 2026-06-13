import { useNavigate } from 'react-router-dom'

// ResetPinPage just redirects to ForgotPinPage which handles both steps
export default function ResetPinPage() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Redirecting...</p>
        <button onClick={() => navigate('/forgot-pin')} className="text-green-600 underline">
          Go to Forgot PIN
        </button>
      </div>
    </div>
  )
}