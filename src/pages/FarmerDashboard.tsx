import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

// ===== INLINE HELPER COMPONENTS =====
function QuickActionBtn({ emoji, label, color, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border ${color} active:opacity-70 transition-opacity`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  )
}

function BottomNavBtn({ emoji, label, active, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1 px-2 min-w-0">
      <span className={`text-xl transition-transform ${active ? 'scale-110' : ''}`}>{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
    </button>
  )
}

// ===== MAIN COMPONENT =====
export default function FarmerDashboard() {
  const navigate = useNavigate()
  const { member, roles, logout, setActiveRole } = useMobileStore()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!member?.id) {
      navigate('/login')
      return
    }
    fetchDashboard()
  }, [member?.id])

  const fetchDashboard = async (retries = 3) => {
    if (!member?.id) return
    try {
      const r = await api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      setData(r.data.data)
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchDashboard(retries - 1), 2000)
        return
      }
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboard()
  }

  if (!member) return null

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <span>Loading...</span>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* ===== HEADER ===== */}
      <div className="bg-green-700 text-white p-4 flex justify-between">
        <h1 className="font-bold">Welcome {member.fullName}</h1>
        <button onClick={() => { logout(); navigate('/login') }}>Logout</button>
      </div>

      {/* ===== CONTENT (UNCHANGED SIMPLIFIED) ===== */}
      <div className="p-4 space-y-4">
        <button onClick={() => navigate('/farmer/harvest/new')} className="bg-green-600 text-white px-4 py-2 rounded">
          New Harvest
        </button>
      </div>

      {/* ===== UPDATED BOTTOM NAVIGATION ===== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 shadow-lg">
        <div className="flex items-center justify-around max-w-lg mx-auto">

          <BottomNavBtn
            emoji="🏠"
            label="Home"
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />

          <BottomNavBtn
            emoji="🌿"
            label="Harvests"
            active={activeTab === 'harvests'}
            onClick={() => setActiveTab('harvests')}
          />

          <div className="flex flex-col items-center -mt-8">
            <button
              onClick={() => navigate('/farmer/harvest/new')}
              className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-xl border-4 border-white active:bg-green-700"
            >
              <span className="text-white text-3xl font-black">+</span>
            </button>
            <span className="text-xs text-gray-400 mt-1">Schedule</span>
          </div>

          <BottomNavBtn
            emoji="🔔"
            label="Updates"
            active={false}
            onClick={() => navigate('/farmer/notifications')}
          />

          <BottomNavBtn
            emoji="👤"
            label="Profile"
            active={false}
            onClick={() => navigate('/farmer/profile')}
          />

        </div>
      </div>

    </div>
  )
}