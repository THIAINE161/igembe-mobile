import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

export default function AgrovetOrderPage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()
  const [products, setProducts] = useState<any[]>([])
  const [myOrders, setMyOrders] = useState<any[]>([])
  const [cart, setCart] = useState<{ product: any; quantity: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'orders'>('shop')
  const [showConfirm, setShowConfirm] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'credit'>('mpesa')
  const [mpesaLoading, setMpesaLoading] = useState(false)
  const [orderLoading, setOrderLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [mpesaSent, setMpesaSent] = useState(false)
  const [checkoutId, setCheckoutId] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async (retries = 3) => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/api/agrovet/products'),
        api.get('/api/agrovet/orders')
      ])
      setProducts((productsRes.data.data || []).filter((p: any) => p.stockQuantity > 0))
      const all = ordersRes.data.data || []
      setMyOrders(all.filter((o: any) => o.memberId === member?.id))
    } catch (err) {
      if (retries > 0) setTimeout(() => fetchData(retries - 1), 2000)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(c => c.product.id !== productId))

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return }
    setCart(prev => prev.map(c => c.product.id === productId ? { ...c, quantity: qty } : c))
  }

  const cartTotal = cart.reduce((sum, c) => sum + Number(c.product.unitPrice) * c.quantity, 0)
  const transactionFee = cartTotal > 250000 ? 2500 : Math.ceil(cartTotal * 0.005)
  const totalWithFee = cartTotal + transactionFee

  const handleMpesaPayment = async () => {
    setMpesaLoading(true)
    setError('')
    try {
      const response = await api.post('/api/mpesa/agrovet-payment', {
        phoneNumber: member?.phoneNumber,
        amount: cartTotal,
        memberNumber: member?.memberNumber
      })
      setCheckoutId(response.data.checkoutRequestId || '')
      setMpesaSent(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'M-Pesa prompt failed. Try again.')
    } finally {
      setMpesaLoading(false)
    }
  }

  const handlePlaceOrder = async () => {
    if (!member?.id) return
    setOrderLoading(true)
    setError('')
    try {
      await api.post('/api/agrovet/orders', {
        memberId: member.id,
        items: cart.map(c => ({
          productId: c.product.id,
          quantity: c.quantity,
          unitPrice: c.product.unitPrice
        })),
        paymentMethod,
        isCredit: paymentMethod === 'credit',
        mpesaReference: checkoutId || undefined
      })
      setCart([])
      setShowConfirm(false)
      setMpesaSent(false)
      setCheckoutId('')
      await fetchData()
      setActiveTab('orders')
      setSuccess('✅ Order placed! Visit SACCO office to collect your items.')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order')
    } finally {
      setOrderLoading(false)
    }
  }

  const categoryEmoji: Record<string, string> = {
    fertilizer: '🌱', pesticide: '🧪', herbicide: '🌿',
    fungicide: '🍄', seed: '🌾', equipment: '🔧', other: '📦'
  }

  // Confirm Screen
  if (showConfirm) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => { setShowConfirm(false); setMpesaSent(false); setError('') }}
          className="text-green-200 text-sm mb-4">← Back to Cart</button>
        <h1 className="text-2xl font-black text-white">Complete Order 📋</h1>
      </div>

      <div className="px-4 py-5 space-y-4">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Order Summary */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-black text-gray-900 mb-3">Order Summary</p>
          {cart.map(item => (
            <div key={item.product.id} className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">{item.product.productName} × {item.quantity}</span>
              <span className="font-bold">KES {(Number(item.product.unitPrice) * item.quantity).toLocaleString()}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-bold">KES {cartTotal.toLocaleString()}</span>
            </div>
            {paymentMethod === 'mpesa' && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Service fee (0.5%)</span>
                <span className="font-bold text-orange-600">KES {transactionFee.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-lg border-t border-gray-100 pt-2 mt-2">
              <span>Total</span>
              <span className="text-green-600">
                KES {(paymentMethod === 'mpesa' ? totalWithFee : cartTotal).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-black text-gray-900 mb-4">How to Pay</p>
          <div className="space-y-3">
            {[
              { m: 'mpesa' as const, icon: '📱', title: 'Pay via M-Pesa', desc: `Prompt sent to ${member?.phoneNumber}` },
              { m: 'cash' as const, icon: '💵', title: 'Pay Cash at Office', desc: 'Bring cash when collecting items' },
              { m: 'credit' as const, icon: '🤝', title: 'Credit (Pay Later)', desc: 'Deducted from next harvest payment' },
            ].map(opt => (
              <button key={opt.m} onClick={() => { setPaymentMethod(opt.m); setMpesaSent(false); setError('') }}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  paymentMethod === opt.m ? 'border-green-500 bg-green-50' : 'border-gray-200'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    paymentMethod === opt.m ? 'bg-green-600' : 'bg-gray-100'
                  }`}>{opt.icon}</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{opt.title}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === opt.m ? 'border-green-500 bg-green-500' : 'border-gray-300'
                  }`}>
                    {paymentMethod === opt.m && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* M-Pesa Flow */}
        {paymentMethod === 'mpesa' && !mpesaSent && (
          <button onClick={handleMpesaPayment} disabled={mpesaLoading}
            className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
            {mpesaLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Sending prompt...
              </>
            ) : `📱 Pay KES ${totalWithFee.toLocaleString()} via M-Pesa`}
          </button>
        )}

        {/* M-Pesa sent confirmation */}
        {paymentMethod === 'mpesa' && mpesaSent && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <p className="font-bold text-green-800 mb-1">📱 Check Your Phone!</p>
              <p className="text-sm text-green-700">
                An M-Pesa prompt has been sent to <strong>{member?.phoneNumber}</strong>.
                Enter your PIN to complete payment of KES {totalWithFee.toLocaleString()}.
              </p>
              {checkoutId && (
                <p className="text-xs text-green-600 mt-2 font-mono">Ref: {checkoutId}</p>
              )}
            </div>
            <button onClick={handlePlaceOrder} disabled={orderLoading}
              className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg">
              {orderLoading ? 'Placing Order...' : '✅ I\'ve Paid — Place Order'}
            </button>
            <button onClick={() => { setMpesaSent(false); setCheckoutId('') }}
              className="w-full border-2 border-gray-200 text-gray-600 font-bold py-3 rounded-2xl text-sm">
              Resend M-Pesa Prompt
            </button>
          </div>
        )}

        {/* Non-mpesa order */}
        {paymentMethod !== 'mpesa' && (
          <>
            {paymentMethod === 'credit' && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
                <p className="text-xs text-orange-700">
                  ⚠️ Credit amount will be deducted from your next harvest payment automatically.
                </p>
              </div>
            )}
            <button onClick={handlePlaceOrder} disabled={orderLoading}
              className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg">
              {orderLoading ? 'Placing Order...' : `✅ Place Order — KES ${cartTotal.toLocaleString()}`}
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => navigate('/farmer')} className="text-green-200 text-sm mb-2 block">← Back</button>
            <h1 className="text-2xl font-black text-white">AgroVet Shop 🌱</h1>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setActiveTab('cart')}
              className="relative bg-white bg-opacity-20 rounded-2xl px-4 py-2 text-white font-bold text-sm">
              🛒 Cart
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-black">
                {cart.length}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2">
          {[
            { id: 'shop', label: '🏪 Shop' },
            { id: 'cart', label: `🛒 Cart${cart.length > 0 ? ` (${cart.length})` : ''}` },
            { id: 'orders', label: '📋 Orders' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${
                activeTab === tab.id ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="px-4 py-2 space-y-3">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
            {success}
          </div>
        )}

        {/* SHOP */}
        {activeTab === 'shop' && (
          loading ? (
            <div className="flex justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center">
              <p className="text-4xl mb-3">🌱</p>
              <p className="font-bold text-gray-700">No products available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(product => {
                const inCart = cart.find(c => c.product.id === product.id)
                return (
                  <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                        {categoryEmoji[product.category] || '📦'}
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-gray-900 text-sm">{product.productName}</p>
                        {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                        <p className="font-black text-green-600 mt-1">
                          KES {Number(product.unitPrice).toLocaleString()}/{product.unit}
                        </p>
                        <p className="text-xs text-gray-400">{product.stockQuantity} in stock</p>
                      </div>
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(product.id, inCart.quantity - 1)}
                            className="w-8 h-8 bg-red-100 text-red-600 rounded-xl font-black flex items-center justify-center">−</button>
                          <span className="font-black w-5 text-center">{inCart.quantity}</span>
                          <button onClick={() => addToCart(product)}
                            className="w-8 h-8 bg-green-600 text-white rounded-xl font-black flex items-center justify-center">+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(product)}
                          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* CART */}
        {activeTab === 'cart' && (
          cart.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center">
              <p className="text-5xl mb-3">🛒</p>
              <p className="font-bold text-gray-700">Cart is empty</p>
              <button onClick={() => setActiveTab('shop')}
                className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl shadow-sm p-5">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                    <div className="text-xl">{categoryEmoji[item.product.category] || '📦'}</div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{item.product.productName}</p>
                      <p className="text-xs text-gray-500">KES {Number(item.product.unitPrice).toLocaleString()}/{item.product.unit}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 bg-red-100 text-red-600 rounded-lg font-black flex items-center justify-center">−</button>
                      <span className="font-black w-5 text-center text-sm">{item.quantity}</span>
                      <button onClick={() => addToCart(item.product)}
                        className="w-7 h-7 bg-green-600 text-white rounded-lg font-black flex items-center justify-center">+</button>
                    </div>
                    <p className="font-black text-green-600 text-sm ml-2">
                      KES {(Number(item.product.unitPrice) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                ))}
                <div className="pt-3 flex justify-between font-black text-xl">
                  <span>Total</span>
                  <span className="text-green-600">KES {cartTotal.toLocaleString()}</span>
                </div>
              </div>
              <button onClick={() => setShowConfirm(true)}
                className="w-full bg-green-600 text-white font-black py-5 rounded-2xl text-xl">
                Proceed to Checkout →
              </button>
            </div>
          )
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          myOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-bold text-gray-700">No orders yet</p>
              <button onClick={() => setActiveTab('shop')}
                className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                Browse Products
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="flex justify-between px-4 py-3 bg-gray-50">
                    <div>
                      <p className="font-black text-green-600 text-sm">
                        {order.orderNumber || `ORD-${order.id?.slice(-6).toUpperCase()}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.orderedAt || order.createdAt).toLocaleDateString('en-KE')}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize self-center ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{order.status}</span>
                  </div>
                  <div className="p-4">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.product?.productName} × {item.quantity}</span>
                        <span className="font-medium">KES {(Number(item.unitPrice) * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-black text-green-600 pt-2 border-t border-gray-100 mt-2">
                      <span>Total</span>
                      <span>KES {Number(order.totalAmount).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 capitalize">Payment: {order.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {activeTab === 'shop' && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <button onClick={() => setActiveTab('cart')}
            className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-between px-5">
            <span>🛒 View Cart ({cart.length})</span>
            <span>KES {cartTotal.toLocaleString()} →</span>
          </button>
        </div>
      )}
    </div>
  )
}