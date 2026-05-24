import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} text-blue-600`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

const STATUS_COLOR: Record<string, string> = {
  confirmed: 'bg-blue-100 text-blue-700',
  harvesting: 'bg-yellow-100 text-yellow-700',
  picked_up: 'bg-purple-100 text-purple-700',
  delivered_to_sacco: 'bg-orange-100 text-orange-700',
  graded: 'bg-teal-100 text-teal-700',
  paid: 'bg-green-100 text-green-700',
}

export default function AgentDashboard() {
  const navigate = useNavigate()
  const { agent, driver, roles, logout, setActiveRole } = useMobileStore()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const [actionLoading, setActionLoading] = useState('')
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [selectedHarvest, setSelectedHarvest] = useState<any>(null)
  const [actualKg, setActualKg] = useState('')
  const [agentNotes, setAgentNotes] = useState('')
  const [quantityLoading, setQuantityLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [actionError, setActionError] = useState('')

  const [showGradeModal, setShowGradeModal] = useState(false)
  const [gradeHarvest, setGradeHarvest] = useState<any>(null)
  const [gradeItems, setGradeItems] = useState([
    { miraaGrade: 'Grade 1', weightKg: '', pricePerKg: '' },
    { miraaGrade: 'Grade 2', weightKg: '', pricePerKg: '' },
    { miraaGrade: 'Gomba', weightKg: '', pricePerKg: '' },
  ])
  const [gradeLoading, setGradeLoading] = useState(false)
  const [gradeError, setGradeError] = useState('')

  const agentData = agent || driver

  useEffect(() => {
    if (!agentData?.id) {
      navigate('/login', { replace: true })
      return
    }

    loadDashboard()
    const interval = setInterval(() => loadDashboard(false), 90000)

    return () => clearInterval(interval)
  }, [agentData?.id])

  const loadDashboard = async (showSpinner = true) => {
    if (!agentData?.id) return

    if (showSpinner) setLoading(true)
    else setRefreshing(true)

    setError('')

    try {
      const r = await api.get(`/api/mobile/agent/${agentData.id}/dashboard`)

      if (r?.data?.data) {
        setData(r.data.data)
      } else {
        setError('No data received')
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to load'
      if (showSpinner) setError(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const handleStartHarvest = async (harvestId: string) => {
    setActionLoading(harvestId)
    setActionError('')

    try {
      await api.patch(`/api/harvests/${harvestId}/start-harvest`, {})
      showSuccess('Harvesting started! 🌿')
      await loadDashboard(false)
    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoading('')
    }
  }

  const handleRecordQuantity = async () => {
    if (!actualKg || Number(actualKg) <= 0) {
      setActionError('Enter a valid weight in kg')
      return
    }

    if (!selectedHarvest) return

    setQuantityLoading(true)
    setActionError('')
        try {
      await api.patch(`/api/harvests/${selectedHarvest.id}/record-quantity`, {
        actualWeightKg: Number(actualKg),
        agentNotes: agentNotes || undefined
      })

      setShowQuantityModal(false)
      setActualKg('')
      setAgentNotes('')
      setSelectedHarvest(null)

      showSuccess('Quantity recorded! Miraa in transit to SACCO. ✅')
      await loadDashboard(false)

    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed to record quantity')
    } finally {
      setQuantityLoading(false)
    }
  }

  const handleDeliver = async (harvestId: string) => {
    setActionLoading(harvestId)
    setActionError('')

    try {
      await api.patch(`/api/harvests/${harvestId}/deliver`, {})
      showSuccess('Delivered to SACCO! ✅')
      await loadDashboard(false)
    } catch (e: any) {
      setActionError(e?.response?.data?.error || 'Failed. Try again.')
    } finally {
      setActionLoading('')
    }
  }

  const handleSubmitGrades = async () => {
    if (!gradeHarvest) return

    const valid = gradeItems.filter(
      item => item.weightKg && item.pricePerKg && Number(item.weightKg) > 0
    )

    if (!valid.length) {
      setGradeError('Add at least one grade with weight and price')
      return
    }

    setGradeLoading(true)
    setGradeError('')

    try {
      await api.post(`/api/harvests/${gradeHarvest.id}/grade`, {
        items: valid.map(item => ({
          miraaGrade: item.miraaGrade,
          weightKg: Number(item.weightKg),
          pricePerKg: Number(item.pricePerKg)
        })),
        gradedBy: agentData?.fullName || 'Agent'
      })

      setShowGradeModal(false)
      setGradeHarvest(null)

      setGradeItems([
        { miraaGrade: 'Grade 1', weightKg: '', pricePerKg: '' },
        { miraaGrade: 'Grade 2', weightKg: '', pricePerKg: '' },
        { miraaGrade: 'Gomba', weightKg: '', pricePerKg: '' },
      ])

      showSuccess('Grades submitted! ✅')
      await loadDashboard(false)

    } catch (err: any) {
      setGradeError(err?.response?.data?.error || 'Failed to submit grades')
    } finally {
      setGradeLoading(false)
    }
  }

  if (!agentData) {
    navigate('/login', { replace: true })
    return null
  }

  const active = data?.activeHarvests || []
  const completed = data?.completedHarvests || []
  const stats = data?.stats || {}
  const agentInfo = data?.agent || agentData
    return (
    <div className="min-h-screen bg-gray-50 pb-24">

      <div className="px-4 -mt-10 space-y-4">

        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
            {successMsg}
          </div>
        )}

        {actionError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
            <span>⚠️ {actionError}</span>
            <button onClick={() => setActionError('')} className="font-bold">×</button>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            🌿 Active ({active.length})
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 rounded-2xl text-sm font-bold ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            ✅ Completed ({completed.length})
          </button>
        </div>

        {gradeHarvest?.status === 'delivered_to_sacco' && (
          <>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-sm font-bold text-orange-800">
                🏭 Delivered to SACCO
              </p>
              <p className="text-xs text-orange-600 mt-0.5">
                Ready for grading
              </p>
            </div>

            <button
              onClick={() => {
                setGradeHarvest(gradeHarvest)
                setShowGradeModal(true)
                setGradeError('')
              }}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl font-bold text-sm"
            >
              🧪 Grade Harvest
            </button>
          </>
        )}
      </div>
    </div>
  )
}