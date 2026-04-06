import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function FarmerDashboard() {
  const navigate = useNavigate()
  const { member, roles, logout, setActiveRole } = useMobileStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'harvests' | 'savings' | 'loans'>('home')

  const fetchDashboard = useCallback(async (retries = 3) => {
    if (!member?.id) { navigate('/login'); return }
    try {
      const r = await api.get(`/api/mobile/farmer/${member.id}/dashboard`)
      setData(r.data.data)
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchDashboard(retries - 1), 2000)
        return
      }
    } finally {
      setLoading(false)
    }
  }, [member?.id])

  useEffect(() => { fetchDashboard() }, [])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
        <span className="text-white text-2xl font-black">IG</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span className="text-sm">Loading dashboard...</span>
      </div>
    </div>
  )

  const totalSavings = data?.totalSavings || 0
  const activeLoans = data?.activeLoans || []
  const recentHarvests = data?.recentHarvests || []
  const prices = data?.currentPrices || []

  const statusColors: Record<string, string> = {
    scheduled: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-purple-100 text-purple-700',
    delivered_to_sacco: 'bg-orange-100 text-orange-700',
    graded: 'bg-teal-100 text-teal-700',
    paid: 'bg-green-100 text-green-700',
  }

  const statusDescriptions: Record<string, string> = {
    scheduled: '⏳ Waiting for driver assignment',
    confirmed: '🚗 Driver assigned — pickup confirmed',
    picked_up: '📦 Driver has picked up your miraa',
    delivered_to_sacco: '🏭 Miraa delivered to SACCO',
    graded: '✅ Miraa graded — awaiting payment',
    paid: '💰 Payment sent to your M-Pesa!',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-green-700 to-green-600 px-6 pt-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-green-200 text-sm">
              {new Date().getHours() < 12 ? '🌅 Good morning' :
               new Date().getHours() < 17 ? '☀️ Good afternoon' : '🌙 Good evening'}
            </p>
            <h1 className="text-white text-2xl font-black">
              {data?.member?.fullName?.split(' ')[0]} 👋
            </h1>
            <p className="text-green-200 text-sm">{data?.member?.memberNumber}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }}
            className="bg-green-800 bg-opacity-50 text-white text-xs px-3 py-2 rounded-xl">
            Logout
          </button>
        </div>

        {/* Balance Card */}
        <div className="bg-white bg-opacity-15 rounded-2xl p-5 text-white">
          <p className="text-green-100 text-sm mb-1">Total Savings Balance</p>
          <p className="text-4xl font-black">KES {totalSavings.toLocaleString()}</p>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-green-200">
              📊 {data?.savingsAccounts?.length || 0} account(s)
            </span>
            {activeLoans.length > 0 && (
              <span className="text-green-200">
                💰 {activeLoans.length} active loan(s)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-16 space-y-4">

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            <MobileAction emoji="📅" label="Schedule Pickup" onClick={() => navigate('/farmer/harvest/new')} color="bg-green-50" />
            <MobileAction emoji="🌿" label="My Harvests" onClick={() => setActiveTab('harvests')} color="bg-teal-50" />
            <MobileAction emoji="💵" label="My Savings" onClick={() => setActiveTab('savings')} color="bg-blue-50" />
            <MobileAction emoji="💰" label="Loans" onClick={() => setActiveTab('loans')} color="bg-purple-50" />
          </div>
        </div>

        {/* Switch to Driver */}
        {roles.includes('driver') && (
          <button onClick={() => { setActiveRole('driver'); navigate('/driver') }}
            className="w-full bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <div className="text-left">
                <p className="font-bold text-blue-900 text-sm">Switch to Driver View</p>
                <p className="text-blue-600 text-xs">View & confirm assigned pickups</p>
              </div>
            </div>
            <span className="text-blue-500 font-bold">→</span>
          </button>
        )}

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <>
            {/* Today's Prices */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-3">Today's Miraa Prices 🌿</h3>
              {prices.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-3">
                  Prices not set yet. Contact SACCO office.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {prices.map((price: any) => (
                    <div key={price.id}
                      className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-600 font-bold mb-1">{price.miraaGrade}</p>
                      <p className="text-xl font-black text-green-700">
                        {Number(price.buyingPrice).toLocaleString()}
                      </p>
                      <p className="text-xs text-green-500">KES/kg</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Harvests with Tracking */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Recent Harvests</h3>
                <button onClick={() => navigate('/farmer/harvest/new')}
                  className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold">
                  + Schedule
                </button>
              </div>
              {recentHarvests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">🌿</p>
                  <p className="text-gray-500 text-sm font-medium">No harvests yet</p>
                  <button onClick={() => navigate('/farmer/harvest/new')}
                    className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                    Schedule First Pickup
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentHarvests.map((h: any) => {
                    const totalVal = h.items?.reduce(
                      (s: number, i: any) => s + Number(i.totalValue), 0) || 0
                    return (
                      <div key={h.id} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-gray-50">
                          <span className="font-bold text-sm text-gray-900">{h.harvestNumber}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[h.status] || 'bg-gray-100 text-gray-600'}`}>
                            {h.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="text-xs text-gray-600 mb-2">
                            {statusDescriptions[h.status] || h.status}
                          </p>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>📅 {new Date(h.harvestDate).toLocaleDateString('en-KE')}</span>
                            {h.assignedDriver && (
                              <span>🚗 {h.assignedDriver}</span>
                            )}
                          </div>
                          {totalVal > 0 && (
                            <p className="font-black text-green-600 mt-2">
                              Payment: KES {totalVal.toLocaleString()}
                            </p>
                          )}
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                              <span>Scheduled</span>
                              <span>Picked Up</span>
                              <span>Paid</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className={`h-2 rounded-full transition-all ${
                                h.status === 'paid' ? 'bg-green-500 w-full' :
                                h.status === 'graded' ? 'bg-teal-500 w-5/6' :
                                h.status === 'delivered_to_sacco' ? 'bg-orange-500 w-4/6' :
                                h.status === 'picked_up' ? 'bg-purple-500 w-3/6' :
                                h.status === 'confirmed' ? 'bg-blue-500 w-2/6' :
                                'bg-yellow-500 w-1/6'
                              }`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* HARVESTS TAB */}
        {activeTab === 'harvests' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">All My Harvests</h3>
              <button onClick={() => navigate('/farmer/harvest/new')}
                className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-xl font-bold">
                + New
              </button>
            </div>
            {recentHarvests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">🌿</p>
                <p className="text-gray-500 text-sm">No harvests yet</p>
                <button onClick={() => navigate('/farmer/harvest/new')}
                  className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                  Schedule First Pickup
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentHarvests.map((h: any) => {
                  const totalVal = h.items?.reduce(
                    (s: number, i: any) => s + Number(i.totalValue), 0) || 0
                  return (
                    <div key={h.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-green-600 px-4 py-3 flex justify-between items-center">
                        <span className="font-black text-white">{h.harvestNumber}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${statusColors[h.status]}`}>
                          {h.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        <p className="text-sm text-gray-600">
                          📅 {new Date(h.harvestDate).toLocaleDateString('en-KE', {
                            weekday: 'long', day: 'numeric', month: 'long'
                          })}
                        </p>
                        {h.farmLocation && (
                          <p className="text-sm text-gray-600">📍 {h.farmLocation}</p>
                        )}
                        {h.assignedDriver && (
                          <p className="text-sm text-blue-600">🚗 Driver: {h.assignedDriver} ({h.vehicleReg})</p>
                        )}
                        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                          {statusDescriptions[h.status]}
                        </p>
                        {h.items?.length > 0 && (
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs text-green-600 font-bold mb-1">Grading Results:</p>
                            {h.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between text-xs text-green-700">
                                <span>{item.miraaGrade}: {item.weightKg}kg × KES {Number(item.pricePerKg).toLocaleString()}</span>
                                <span className="font-bold">KES {Number(item.totalValue).toLocaleString()}</span>
                              </div>
                            ))}
                            <div className="border-t border-green-200 mt-2 pt-2 flex justify-between font-black text-green-800">
                              <span>Total Payment</span>
                              <span>KES {totalVal.toLocaleString()}</span>
                            </div>
                          </div>
                        )}
                        {/* Progress */}
                        <div className="mt-2">
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`h-2 rounded-full ${
                              h.status === 'paid' ? 'bg-green-500 w-full' :
                              h.status === 'graded' ? 'bg-teal-500 w-5/6' :
                              h.status === 'delivered_to_sacco' ? 'bg-orange-500 w-4/6' :
                              h.status === 'picked_up' ? 'bg-purple-500 w-3/6' :
                              h.status === 'confirmed' ? 'bg-blue-500 w-2/6' :
                              'bg-yellow-500 w-1/6'
                            }`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* SAVINGS TAB */}
        {activeTab === 'savings' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4">My Savings Accounts 💵</h3>
              {!data?.savingsAccounts || data.savingsAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-3">💵</p>
                  <p className="text-gray-500 text-sm font-medium">No savings accounts yet</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Visit SACCO office to open a savings account
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.savingsAccounts.map((acc: any) => (
                    <div key={acc.id} className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-5 text-white">
                      <p className="text-green-100 text-xs mb-1">{acc.accountNumber}</p>
                      <p className="text-green-100 text-sm capitalize mb-3">
                        {acc.accountType} Account
                      </p>
                      <p className="text-4xl font-black">
                        KES {Number(acc.balance).toLocaleString()}
                      </p>
                      <p className="text-green-200 text-xs mt-2">Current Balance</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* How to deposit */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <h4 className="font-bold text-blue-900 mb-3">💡 How to Save Money</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Send M-Pesa</p>
                    <p className="text-xs text-blue-700">Send money to Igembe SACCO Paybill</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Staff Records It</p>
                    <p className="text-xs text-blue-700">SACCO staff records your deposit with the M-Pesa code</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Balance Updates</p>
                    <p className="text-xs text-blue-700">Your balance reflects here immediately</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 bg-white rounded-xl p-3 border border-blue-200">
                <p className="text-xs text-blue-600 font-bold">📞 Contact SACCO Office</p>
                <p className="text-sm font-black text-blue-900 mt-1">+254 757 630 995</p>
              </div>
            </div>
          </div>
        )}

        {/* LOANS TAB */}
        {activeTab === 'loans' && (
          <div className="space-y-4">
            {activeLoans.length > 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">My Active Loans 💰</h3>
                <div className="space-y-4">
                  {activeLoans.map((loan: any) => {
                    const percent = Math.min(100,
                      Math.round((Number(loan.amountPaid) / Number(loan.totalPayable)) * 100)
                    )
                    return (
                      <div key={loan.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between mb-3">
                          <span className="font-black text-gray-900">{loan.loanNumber}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${
                            loan.status === 'repaying' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {loan.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500">Principal</p>
                            <p className="font-black text-gray-900">
                              KES {Number(loan.principalAmount).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-red-50 rounded-xl p-3">
                            <p className="text-xs text-red-500">Balance</p>
                            <p className="font-black text-red-600">
                              KES {Number(loan.balanceOutstanding).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-3">
                            <p className="text-xs text-green-500">Amount Paid</p>
                            <p className="font-black text-green-600">
                              KES {Number(loan.amountPaid).toLocaleString()}
                            </p>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-3">
                            <p className="text-xs text-blue-500">Monthly</p>
                            <p className="font-black text-blue-600">
                              KES {Number(loan.monthlyInstallment).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Repayment Progress</span>
                            <span>{percent}% paid</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3">
                            <div
                              className="bg-green-500 h-3 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                        {loan.dueDate && (
                          <p className="text-xs text-orange-600 mt-2">
                            📅 Due: {new Date(loan.dueDate).toLocaleDateString('en-KE')}
                          </p>
                        )}
                        <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <p className="text-xs text-yellow-700">
                            💡 To make a repayment, send M-Pesa to the SACCO office and they will record it for you.
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">Loans 💰</h3>
                <div className="text-center py-6">
                  <p className="text-5xl mb-4">💰</p>
                  <p className="font-bold text-gray-900 mb-2">No Active Loans</p>
                  <p className="text-gray-500 text-sm mb-4">
                    You don't have any active loans at the moment.
                  </p>
                </div>
              </div>
            )}

            {/* How to apply for loan */}
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <h4 className="font-bold text-green-900 mb-3">📋 How to Apply for a Loan</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <div>
                    <p className="text-sm font-bold text-green-900">Visit SACCO Office</p>
                    <p className="text-xs text-green-700">Come to Igembe SACCO office during working hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <div>
                    <p className="text-sm font-bold text-green-900">Bring Your Documents</p>
                    <p className="text-xs text-green-700">National ID, Member Number, Guarantor details</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <div>
                    <p className="text-sm font-bold text-green-900">Staff Processes Application</p>
                    <p className="text-xs text-green-700">Application reviewed and approved within 2-3 days</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                  <div>
                    <p className="text-sm font-bold text-green-900">Receive Money via M-Pesa</p>
                    <p className="text-xs text-green-700">Loan disbursed directly to your M-Pesa</p>
                  </div>
                </div>
              </div>

              {/* Loan requirements */}
              <div className="mt-4 bg-white rounded-xl p-4 border border-green-200">
                <p className="text-xs font-bold text-green-800 mb-2">✅ Loan Requirements:</p>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• Active SACCO member for at least 3 months</li>
                  <li>• Minimum savings of KES 1,000</li>
                  <li>• Valid National ID</li>
                  <li>• One guarantor (fellow SACCO member)</li>
                  <li>• No existing defaulted loans</li>
                </ul>
              </div>

              <div className="mt-4 bg-white rounded-xl p-3 border border-green-200">
                <p className="text-xs text-green-600 font-bold">📞 Call us to inquire</p>
                <p className="text-sm font-black text-green-900 mt-1">+254 757 630 995</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex justify-around">
          <NavItem emoji="🏠" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavItem emoji="🌿" label="Harvests" active={activeTab === 'harvests'} onClick={() => setActiveTab('harvests')} />
          <div className="flex flex-col items-center -mt-6">
            <button onClick={() => navigate('/farmer/harvest/new')}
              className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
              <span className="text-white text-2xl font-black">+</span>
            </button>
            <span className="text-xs text-gray-500 mt-1">Schedule</span>
          </div>
          <NavItem emoji="💵" label="Savings" active={activeTab === 'savings'} onClick={() => setActiveTab('savings')} />
          <NavItem emoji="💰" label="Loans" active={activeTab === 'loans'} onClick={() => setActiveTab('loans')} />
        </div>
      </div>
    </div>
  )
}

function MobileAction({ emoji, label, onClick, color }: {
  emoji: string; label: string; onClick: () => void; color: string
}) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl ${color} hover:opacity-80`}>
      <span className="text-2xl">{emoji}</span>
      <span className="text-xs text-gray-700 text-center leading-tight font-medium">{label}</span>
    </button>
  )
}

function NavItem({ emoji, label, active, onClick }: {
  emoji: string; label: string; active: boolean; onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-1">
      <span className="text-xl">{emoji}</span>
      <span className={`text-xs font-medium ${active ? 'text-green-600' : 'text-gray-400'}`}>
        {label}
      </span>
    </button>
  )
}