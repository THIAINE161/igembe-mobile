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
  const [orderLoading, setOrderLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'shop' | 'orders'>('shop')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/api/agrovet/products'),
        api.get('/api/agrovet/orders')
      ])
      setProducts(productsRes.data.data.filter((p: any) => p.stockQuantity > 0))
      const memberOrders = ordersRes.data.data.filter(
        (o: any) => o.memberId === member?.id
      )
      setMyOrders(memberOrders)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: any) => {
    const existing = cart.find(c => c.product.id === product.id)
    if (existing) {
      if (existing.quantity >= product.stockQuantity) return
      setCart(cart.map(c =>
        c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
      ))
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.product.id !== productId))
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId)
      return
    }
    setCart(cart.map(c =>
      c.product.id === productId ? { ...c, quantity: qty } : c
    ))
  }

  const cartTotal = cart.reduce(
    (sum, c) => sum + Number(c.product.unitPrice) * c.quantity, 0
  )

  const handlePlaceOrder = async () => {
    if (!member?.id || cart.length === 0) return
    setOrderLoading(true)
    setError('')
    try {
      await api.post('/api/agrovet/orders', {
        memberId: member.id,
        items: cart.map(c => ({ productId: c.product.id, quantity: c.quantity })),
        paymentMethod
      })
      setCart([])
      await fetchData()
      setActiveTab('orders')
      setSuccess('Order placed successfully! Visit the SACCO office to collect.')
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order')
    } finally {
      setOrderLoading(false)
    }
  }

  const categoryColors: Record<string, string> = {
    fertilizer: 'bg-green-100 text-green-700',
    pesticide: 'bg-red-100 text-red-700',
    herbicide: 'bg-yellow-100 text-yellow-700',
    fungicide: 'bg-purple-100 text-purple-700',
    seed: 'bg-blue-100 text-blue-700',
    equipment: 'bg-gray-100 text-gray-700',
    other: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => navigate('/farmer')}
          className="text-green-200 text-sm mb-4 flex items-center gap-2">
          ← Back
        </button>
        <h1 className="text-2xl font-black text-white">Igembe AgroVet 🌱</h1>
        <p className="text-green-200 text-sm mt-1">Order farm inputs delivered to SACCO office</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 flex gap-2">
        <button onClick={() => setActiveTab('shop')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold ${
            activeTab === 'shop' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}>
          🛒 Shop {cart.length > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {cart.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold ${
            activeTab === 'orders' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}>
          📋 My Orders ({myOrders.length})
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* SHOP TAB */}
        {activeTab === 'shop' && (
          <>
            {loading ? (
              <div className="text-center py-8">
                <svg className="animate-spin h-8 w-8 text-green-600 mx-auto" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center">
                <p className="text-4xl mb-3">🌱</p>
                <p className="font-bold text-gray-700">No products available</p>
                <p className="text-gray-400 text-sm mt-1">Check back later or contact SACCO office</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map(product => {
                  const inCart = cart.find(c => c.product.id === product.id)
                  return (
                    <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-gray-900">{product.productName}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${categoryColors[product.category] || 'bg-gray-100 text-gray-700'}`}>
                              {product.category}
                            </span>
                          </div>
                          {product.brand && (
                            <p className="text-xs text-gray-400 mb-1">{product.brand}</p>
                          )}
                          {product.description && (
                            <p className="text-xs text-gray-500 mb-2">{product.description}</p>
                          )}
                          <div className="flex items-center gap-3">
                            <p className="font-black text-green-600">
                              KES {Number(product.unitPrice).toLocaleString()}/{product.unit}
                            </p>
                            <p className="text-xs text-gray-400">
                              Stock: {product.stockQuantity} {product.unit}
                            </p>
                          </div>
                        </div>
                        <div className="ml-3">
                          {inCart ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQty(product.id, inCart.quantity - 1)}
                                className="w-8 h-8 bg-red-100 text-red-600 rounded-xl font-black flex items-center justify-center"
                              >
                                −
                              </button>
                              <span className="font-black text-gray-900 w-6 text-center">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => addToCart(product)}
                                className="w-8 h-8 bg-green-600 text-white rounded-xl font-black flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(product)}
                              className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold active:bg-green-700"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Cart Summary */}
            {cart.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm p-5 border border-green-200">
                <p className="font-black text-gray-900 mb-3">🛒 Your Cart</p>
                <div className="space-y-2 mb-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.product.productName}</p>
                        <p className="text-gray-500 text-xs">
                          {item.quantity} {item.product.unit} × KES {Number(item.product.unitPrice).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600">
                          KES {(Number(item.product.unitPrice) * item.quantity).toLocaleString()}
                        </span>
                        <button onClick={() => removeFromCart(item.product.id)}
                          className="text-red-400 font-black">×</button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-2 flex justify-between font-black text-lg">
                    <span>Total</span>
                    <span className="text-green-600">KES {cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cash', 'mpesa', 'credit'].map(method => (
                      <button key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 rounded-xl text-sm font-bold capitalize border-2 ${
                          paymentMethod === method
                            ? 'border-green-600 bg-green-50 text-green-700'
                            : 'border-gray-200 text-gray-600'
                        }`}>
                        {method === 'cash' ? '💵' : method === 'mpesa' ? '📱' : '🤝'} {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-blue-700">
                    📋 <span className="font-bold">Note:</span> After placing order, visit the SACCO office
                    to collect your items and complete payment.
                  </p>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={orderLoading}
                  className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
                >
                  {orderLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Placing Order...
                    </>
                  ) : `Place Order — KES ${cartTotal.toLocaleString()}`}
                </button>
              </div>
            )}
          </>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {myOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-bold text-gray-700">No orders yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Browse our products and place your first order</p>
                <button onClick={() => setActiveTab('shop')}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                  Browse Products
                </button>
              </div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <span className="font-black text-green-600 text-sm">{order.orderNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                        order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{order.status}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="space-y-1 mb-3">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.product?.productName} × {item.quantity}
                          </span>
                          <span className="font-medium">
                            KES {(Number(item.unitPrice) * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                      <div>
                        <p className="text-xs text-gray-400">
                          {new Date(order.orderedAt).toLocaleDateString('en-KE')} · {order.paymentMethod}
                        </p>
                        {order.isCredit && (
                          <span className="text-xs text-red-600 font-medium">📋 Credit (pay on collection)</span>
                        )}
                      </div>
                      <p className="font-black text-green-600">
                        KES {Number(order.totalAmount).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}