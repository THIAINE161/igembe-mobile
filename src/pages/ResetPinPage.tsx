// This page just redirects to ForgotPinPage which handles the full reset flow
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ResetPinPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/forgot-pin', { replace: true })
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Redirecting...</p>
      </div>
    </div>
  )
}