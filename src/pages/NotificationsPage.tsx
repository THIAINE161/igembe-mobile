import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()

  const notifications = [
    {
      id: 1,
      type: 'harvest',
      title: 'Pickup Scheduled',
      message: 'Your harvest pickup has been scheduled. A driver will be assigned shortly.',
      time: 'Just now',
      read: false,
      emoji: '🌿'
    },
    {
      id: 2,
      type: 'payment',
      title: 'Payment Received',
      message: 'You have received KES 45,000 for harvest HRV-0001.',
      time: '2 days ago',
      read: true,
      emoji: '💰'
    },
    {
      id: 3,
      type: 'loan',
      title: 'Loan Reminder',
      message: 'Your monthly loan installment of KES 4,667 is due in 5 days.',
      time: '3 days ago',
      read: true,
      emoji: '📋'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-green-700 px-6 pt-12 pb-6">
        <button onClick={() => navigate(-1)}
          className="text-green-200 text-sm mb-4 flex items-center gap-2">
          ← Back
        </button>
        <h1 className="text-2xl font-black text-white">Notifications 🔔</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {notifications.map(notif => (
          <div key={notif.id}
            className={`bg-white rounded-2xl p-4 shadow-sm border ${
              !notif.read ? 'border-green-300' : 'border-gray-100'
            }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                !notif.read ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <span className="text-xl">{notif.emoji}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-bold text-sm ${
                    !notif.read ? 'text-green-900' : 'text-gray-900'
                  }`}>{notif.title}</p>
                  <span className="text-xs text-gray-400">{notif.time}</span>
                </div>
                <p className="text-xs text-gray-600">{notif.message}</p>
              </div>
              {!notif.read && (
                <div className="w-2 h-2 bg-green-600 rounded-full flex-shrink-0 mt-1" />
              )}
            </div>
          </div>
        ))}

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4">
          <p className="text-xs text-blue-700 text-center">
            📱 Real-time SMS notifications will be sent to your phone when important events happen.
            Make sure your phone number is correct in your profile.
          </p>
        </div>
      </div>
    </div>
  )
}