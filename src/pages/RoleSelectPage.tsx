import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'

export default function RoleSelectPage() {
  const navigate = useNavigate()
  const { member, driver, setActiveRole } = useMobileStore()

  const selectRole = (role: string) => {
    setActiveRole(role)
    navigate(role === 'farmer' ? '/farmer' : '/driver')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-green-700 px-6 pt-12 pb-8 text-center">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-green-700 text-2xl font-black">IG</span>
        </div>
        <h1 className="text-2xl font-black text-white">Welcome Back!</h1>
        <p className="text-green-200 text-sm mt-1">How would you like to sign in today?</p>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 py-8 space-y-4">
        {member && (
          <button
            onClick={() => selectRole('farmer')}
            className="bg-white border-2 border-green-200 hover:border-green-500 rounded-2xl p-6 flex items-center gap-4 text-left transition-all hover:shadow-md"
          >
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🌿</span>
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">Farmer Dashboard</p>
              <p className="text-gray-500 text-sm mt-1">
                {member.fullName} · {member.memberNumber}
              </p>
              <p className="text-green-600 text-xs mt-1">
                View savings, loans & schedule harvest pickup
              </p>
            </div>
          </button>
        )}

        {driver && (
          <button
            onClick={() => selectRole('driver')}
            className="bg-white border-2 border-blue-200 hover:border-blue-500 rounded-2xl p-6 flex items-center gap-4 text-left transition-all hover:shadow-md"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🚗</span>
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">Driver Dashboard</p>
              <p className="text-gray-500 text-sm mt-1">
                {driver.fullName} · {driver.vehicleReg}
              </p>
              <p className="text-blue-600 text-xs mt-1">
                View assigned pickups & confirm deliveries
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}