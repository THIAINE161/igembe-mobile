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
  const [activeTab, setActiveTab] = useState<'shop' | 'cart' | 'orders'>('shop')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | 'credit'>('cash')
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async (retries = 3) => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        api.get('/api/agrovet/products'),
        api.get('/api/agrovet/orders')
      ])
      const allProducts = productsRes.data.data || []
      setProducts(allProducts.filter((p: any) => p.stockQuantity > 0 && p.isActive !== false))
      const allOrders = ordersRes.data.data || []
      setMyOrders(allOrders.filter((o: any) => o.memberId === member?.id))
    } catch (err) {
      if (retries > 0) {
        setTimeout(() => fetchData(retries - 1), 2000)
        return
      }
      console.error('Failed to fetch agrovet data:', err)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (product: any) => {
    const existing = cart.find(c => c.product.id === product.id)
    if (existing) {
      if (existing.quantity >= product.stockQuantity) return
      setCart(cart.map(c =>
        c.product.id === product.id
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ))
    } else {
      setCart([...cart, { product, quantity: 1 }])
    }
  }

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(c => c.product.id !== productId))
  }

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(productId); return }
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
        items: cart.map(c => ({
          productId: c.product.id,
          quantity: c.quantity,
          unitPrice: c.product.unitPrice
        })),
        paymentMethod,
        isCredit: paymentMethod === 'credit'
      })
      setCart([])
      setShowConfirm(false)
      await fetchData()
      setActiveTab('orders')
      setSuccess('✅ Order placed! Visit the SACCO office to collect your items.')
      setTimeout(() => setSuccess(''), 6000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order. Try again.')
    } finally {
      setOrderLoading(false)
    }
  }

  const categoryEmoji: Record<string, string> = {
    fertilizer: '🌱',
    pesticide: '🧪',
    herbicide: '🌿',
    fungicide: '🍄',
    seed: '🌾',
    equipment: '🔧',
    other: '📦'
  }

  const categoryColors: Record<string, string> = {
    fertilizer: 'bg-green-100 text-green-700',
    pesticide: 'bg-red-100 text-red-700',
    herbicide: 'bg-teal-100 text-teal-700',
    fungicide: 'bg-purple-100 text-purple-700',
    seed: 'bg-yellow-100 text-yellow-700',
    equipment: 'bg-gray-100 text-gray-700',
    other: 'bg-orange-100 text-orange-700',
  }

  const orderStatusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    ready: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  // Confirm Order Modal
  if (showConfirm) return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => setShowConfirm(false)}
          className="text-green-200 text-sm mb-4">← Back</button>
        <h1 className="text-2xl font-black text-white">Confirm Order 📋</h1>
        <p className="text-green-200 text-sm mt-1">Review and choose how to pay</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-black text-gray-900 mb-3">Your Order</p>
          <div className="space-y-3">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.product.productName}</p>
                  <p className="text-gray-500 text-xs">
                    {item.quantity} {item.product.unit} × KES {Number(item.product.unitPrice).toLocaleString()}
                  </p>
                </div>
                <p className="font-black text-green-600">
                  KES {(Number(item.product.unitPrice) * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex justify-between font-black text-lg">
              <span>Total</span>
              <span className="text-green-600">KES {cartTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="font-black text-gray-900 mb-4">How would you like to pay?</p>
          <div className="space-y-3">
            {[
              {
                method: 'cash' as const,
                icon: '💵',
                title: 'Pay Cash at Office',
                desc: 'Pay when you collect your items at the SACCO office'
              },
              {
                method: 'mpesa' as const,
                icon: '📱',
                title: 'Pay via M-Pesa',
                desc: 'Send M-Pesa payment then collect items at office'
              },
              {
                method: 'credit' as const,
                icon: '🤝',
                title: 'Credit (Pay Later)',
                desc: 'Collect now, pay on your next harvest settlement'
              }
            ].map(option => (
              <button
                key={option.method}
                onClick={() => setPaymentMethod(option.method)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  paymentMethod === option.method
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                    paymentMethod === option.method ? 'bg-green-600' : 'bg-gray-100'
                  }`}>
                    {option.icon}
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${paymentMethod === option.method ? 'text-green-800' : 'text-gray-900'}`}>
                      {option.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${paymentMethod === option.method ? 'text-green-600' : 'text-gray-500'}`}>
                      {option.desc}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === option.method ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {paymentMethod === option.method && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* M-Pesa instructions */}
        {paymentMethod === 'mpesa' && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-blue-800 mb-2">📱 M-Pesa Payment Instructions:</p>
            <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
              <li>Place your order by clicking "Place Order" below</li>
              <li>Send KES {cartTotal.toLocaleString()} to SACCO office via M-Pesa</li>
              <li>Send the M-Pesa code to us on WhatsApp: 0757630995</li>
              <li>Collect your items once payment is confirmed</li>
            </ol>
          </div>
        )}

        {/* Credit warning */}
        {paymentMethod === 'credit' && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-xs text-orange-700">
              ⚠️ <span className="font-bold">Credit terms:</span> Amount will be deducted from your next harvest payment.
              Interest may apply if not settled within 30 days.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handlePlaceOrder}
          disabled={orderLoading}
          className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-5 rounded-2xl text-xl flex items-center justify-center gap-2"
        >
          {orderLoading ? (
            <>
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Placing Order...
            </>
          ) : `✅ Confirm Order — KES ${cartTotal.toLocaleString()}`}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <button onClick={() => navigate('/farmer')}
          className="text-green-200 text-sm mb-4 flex items-center gap-2">
          ← Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">AgroVet Shop 🌱</h1>
            <p className="text-green-200 text-sm mt-1">Farm inputs & supplies</p>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setActiveTab('cart')}
              className="relative bg-white bg-opacity-20 rounded-2xl px-4 py-2 text-white font-bold text-sm"
            >
              🛒 Cart
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-black">
                {cart.length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('shop')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${activeTab === 'shop' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            🏪 Shop
          </button>
          <button onClick={() => setActiveTab('cart')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold relative ${activeTab === 'cart' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            🛒 Cart {cart.length > 0 && `(${cart.length})`}
          </button>
          <button onClick={() => setActiveTab('orders')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${activeTab === 'orders' ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            📋 Orders
          </button>
        </div>
      </div>

      <div className="px-4 py-2 space-y-3">

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
            {success}
          </div>
        )}

        {/* SHOP TAB */}
        {activeTab === 'shop' && (
          loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-green-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center">
              <p className="text-4xl mb-3">🌱</p>
              <p className="font-bold text-gray-700">No products available</p>
              <p className="text-gray-400 text-sm mt-1">Check back later</p>
              <a href="tel:+254757630995"
                className="inline-block mt-4 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                📞 Contact Office
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map(product => {
                const inCart = cart.find(c => c.product.id === product.id)
                return (
                  <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      {/* Product icon */}
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl">
                        {categoryEmoji[product.category] || '📦'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-black text-gray-900 text-sm leading-tight">{product.productName}</p>
                            {product.brand && (
                              <p className="text-gray-400 text-xs">{product.brand}</p>
                            )}
                            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize mt-1 ${categoryColors[product.category] || 'bg-gray-100 text-gray-700'}`}>
                              {product.category}
                            </span>
                          </div>

                          {/* Add/remove controls */}
                          {inCart ? (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button onClick={() => updateQty(product.id, inCart.quantity - 1)}
                                className="w-8 h-8 bg-red-100 text-red-600 rounded-xl font-black flex items-center justify-center text-lg">
                                −
                              </button>
                              <span className="font-black text-gray-900 w-5 text-center">{inCart.quantity}</span>
                              <button onClick={() => addToCart(product)}
                                className="w-8 h-8 bg-green-600 text-white rounded-xl font-black flex items-center justify-center text-lg">
                                +
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(product)}
                              className="bg-green-600 text-white px-4 py-1.5 rounded-xl text-sm font-bold flex-shrink-0">
                              Add
                            </button>
                          )}
                        </div>

                        {product.description && (
                          <p className="text-gray-500 text-xs mt-1 leading-relaxed">{product.description}</p>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <p className="font-black text-green-600">
                            KES {Number(product.unitPrice).toLocaleString()}/{product.unit}
                          </p>
                          <p className="text-xs text-gray-400">
                            {product.stockQuantity} {product.unit} in stock
                          </p>
                        </div>
                      </div>
                    </div>

                    {inCart && (
                      <div className="mt-3 bg-green-50 rounded-xl px-3 py-2 flex justify-between items-center">
                        <span className="text-xs text-green-600 font-medium">In your cart</span>
                        <span className="text-sm font-black text-green-700">
                          KES {(Number(product.unitPrice) * inCart.quantity).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* CART TAB */}
        {activeTab === 'cart' && (
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center">
                <p className="text-5xl mb-3">🛒</p>
                <p className="font-bold text-gray-700">Your cart is empty</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Browse products and add items to cart</p>
                <button onClick={() => setActiveTab('shop')}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                  Browse Products
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <p className="font-black text-gray-900 mb-4">Cart Items ({cart.length})</p>
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                          {categoryEmoji[item.product.category] || '📦'}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-sm text-gray-900">{item.product.productName}</p>
                          <p className="text-xs text-gray-500">
                            KES {Number(item.product.unitPrice).toLocaleString()} / {item.product.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 bg-red-100 text-red-600 rounded-lg font-black flex items-center justify-center">
                            −
                          </button>
                          <span className="font-black text-gray-900 w-5 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => addToCart(item.product)}
                            className="w-7 h-7 bg-green-600 text-white rounded-lg font-black flex items-center justify-center">
                            +
                          </button>
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-black text-green-600 text-sm">
                            KES {(Number(item.product.unitPrice) * item.quantity).toLocaleString()}
                          </p>
                          <button onClick={() => removeFromCart(item.product.id)}
                            className="text-red-400 text-xs font-bold">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between font-black text-xl">
                    <span>Total</span>
                    <span className="text-green-600">KES {cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <p className="text-xs text-blue-700">
                    📋 <span className="font-bold">Collection:</span> After placing your order, visit the SACCO office to collect your items and complete payment.
                  </p>
                </div>

                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full bg-green-600 text-white font-black py-5 rounded-2xl text-xl"
                >
                  Proceed to Order — KES {cartTotal.toLocaleString()} →
                </button>
              </>
            )}
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            {myOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-bold text-gray-700">No orders yet</p>
                <p className="text-gray-400 text-sm mt-1 mb-4">Browse products and place your first order</p>
                <button onClick={() => setActiveTab('shop')}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">
                  Browse Products
                </button>
              </div>
            ) : (
              myOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                    <div>
                      <span className="font-black text-green-600 text-sm">
                        {order.orderNumber || `ORD-${order.id?.slice(-6).toUpperCase()}`}
                      </span>
                      <p className="text-gray-400 text-xs">
                        {new Date(order.orderedAt || order.createdAt).toLocaleDateString('en-KE', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.isCredit && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          Credit
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${orderStatusColor[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    {order.items?.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {item.product?.productName || 'Product'} × {item.quantity} {item.product?.unit}
                            </span>
                            <span className="font-medium">
                              KES {(Number(item.unitPrice) * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                      <div>
                        <p className="text-xs text-gray-400 capitalize">
                          💳 {order.paymentMethod?.replace('_', ' ') || 'cash'}
                        </p>
                        {order.status === 'pending' && (
                          <p className="text-xs text-orange-600 font-medium mt-0.5">
                            ⏳ Awaiting collection at office
                          </p>
                        )}
                        {order.status === 'delivered' && (
                          <p className="text-xs text-green-600 font-medium mt-0.5">
                            ✅ Collected
                          </p>
                        )}
                      </div>
                      <p className="font-black text-green-600 text-lg">
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

      {/* Bottom cart button when on shop tab */}
      {activeTab === 'shop' && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
          <button
            onClick={() => setActiveTab('cart')}
            className="w-full bg-green-600 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-between px-5"
          >
            <span>🛒 View Cart ({cart.length} items)</span>
            <span>KES {cartTotal.toLocaleString()} →</span>
          </button>
        </div>
      )}
    </div>
  )
}