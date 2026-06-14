import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

interface Product {
  id: string
  productName: string
  category: string
  unit: string
  unitPrice: number
  stockQuantity: number
  brand?: string
  description?: string
}

interface CartItem extends Product {
  quantity: number
}

const CATEGORY_EMOJI: Record<string, string> = {
  fertilizer: '🌱', pesticide: '🧪', herbicide: '🌿',
  fungicide: '🍄', seed: '🌾', equipment: '🔧', other: '📦'
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700'
}

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size} text-green-600`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function AgrovetOrderPage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()

  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [orderLoading, setOrderLoading] = useState(false)
  const [view, setView] = useState<'shop' | 'cart' | 'orders'>('shop')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [payMethod, setPayMethod] = useState<'mpesa' | 'cash'>('mpesa')

  useEffect(() => {
    if (!member) { navigate('/login', { replace: true }); return }
    fetchProducts()
    fetchOrders()
  }, [])

  const fetchProducts = async () => {
    try {
      const r = await api.get('/api/agrovet/products/active')
      setProducts(r.data.data || [])
    } catch (e: any) {
      console.error('Failed to fetch products:', e.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = useCallback(async () => {
    if (!member?.id) return
    try {
      const r = await api.get('/api/agrovet/orders')
      const all: any[] = r.data.data || []
      setOrders(all.filter((o: any) => o.memberId === member.id))
    } catch (_) {}
  }, [member?.id])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const item = prev.find(i => i.id === productId)
      if (!item) return prev
      if (item.quantity === 1) return prev.filter(i => i.id !== productId)
      return prev.map(i => i.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }

  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const handlePlaceOrder = async () => {
    if (!cart.length || !member) return
    setOrderLoading(true)
    setError('')

    try {
      // Create the order
      const orderRes = await api.post('/api/agrovet/orders', {
        memberId: member.id,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        paymentMethod: payMethod,
        isCredit: false
      })

      const { orderNumber, totalAmount, id: orderId } = orderRes.data.data

      if (payMethod === 'mpesa') {
        // Navigate to M-Pesa payment page
        navigate(`/farmer/mpesa?type=deposit&amount=${Math.round(totalAmount)}&note=AgroVet order ${orderNumber}`)
        return
      }

      // Cash payment
      setSuccess(`Order ${orderNumber} placed! Pay KES ${Math.round(totalAmount).toLocaleString()} at SACCO office.`)
      setCart([])
      setView('orders')
      await fetchOrders()
      setTimeout(() => setSuccess(''), 6000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to place order. Try again.')
    } finally {
      setOrderLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  const filteredProducts = products.filter(p => {
    const matchSearch = !search ||
      p.productName.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory
    return matchSearch && matchCat
  })

  if (!member) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/farmer')} className="text-green-200 text-sm">← Back</button>
          <h1 className="text-white text-lg font-black">🌱 AgroVet Shop</h1>
          <button onClick={() => setView('cart')} className="relative">
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'shop', label: '🛍️ Shop' },
            { id: 'cart', label: `🛒 Cart (${cartCount})` },
            { id: 'orders', label: '📋 My Orders' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as any)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold ${view === tab.id ? 'bg-white text-green-700' : 'bg-white bg-opacity-20 text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto">
        {/* Alerts */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm mb-3 flex justify-between">
            <span>✅ {success}</span>
            <button onClick={() => setSuccess('')} className="font-bold">×</button>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm mb-3 flex justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="font-bold">×</button>
          </div>
        )}

        {/* ── SHOP VIEW ────────────────────────────────────────────────────── */}
        {view === 'shop' && (
          <div className="space-y-3">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search products..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-green-500 bg-white"
            />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 capitalize ${selectedCategory === cat ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                >
                  {CATEGORY_EMOJI[cat] || ''} {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size={8} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">🌱</p>
                <p className="font-bold text-gray-700">
                  {search ? `No products found for "${search}"` : 'No products available'}
                </p>
                <p className="text-gray-400 text-sm mt-1">Check back later</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map(product => {
                  const inCart = cart.find(i => i.id === product.id)
                  return (
                    <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                      <div className="bg-green-50 h-20 flex items-center justify-center text-4xl">
                        {CATEGORY_EMOJI[product.category] || '📦'}
                      </div>
                      <div className="p-3">
                        <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">
                          {product.productName}
                        </p>
                        {product.brand && (
                          <p className="text-xs text-gray-400">{product.brand}</p>
                        )}
                        <p className="text-green-700 font-black text-sm mt-1">
                          KES {product.unitPrice.toLocaleString()}/{product.unit}
                        </p>
                        <p className="text-xs text-gray-400">Stock: {product.stockQuantity}</p>

                        {product.stockQuantity === 0 ? (
                          <div className="mt-2 bg-gray-100 text-gray-400 text-xs text-center py-2 rounded-xl font-bold">
                            Out of Stock
                          </div>
                        ) : inCart ? (
                          <div className="flex items-center justify-between mt-2">
                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="w-8 h-8 bg-red-100 text-red-600 rounded-xl text-lg font-black flex items-center justify-center"
                            >
                              −
                            </button>
                            <span className="font-black text-gray-900">{inCart.quantity}</span>
                            <button
                              onClick={() => addToCart(product)}
                              disabled={inCart.quantity >= product.stockQuantity}
                              className="w-8 h-8 bg-green-600 disabled:bg-green-200 text-white rounded-xl text-lg font-black flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="w-full mt-2 bg-green-600 text-white text-xs font-bold py-2 rounded-xl"
                          >
                            + Add to Cart
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CART VIEW ────────────────────────────────────────────────────── */}
        {view === 'cart' && (
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-5xl mb-4">🛒</p>
                <p className="font-bold text-gray-700">Your cart is empty</p>
                <button
                  onClick={() => setView('shop')}
                  className="mt-4 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                >
                  Shop Now →
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-black text-gray-900">Cart ({cartCount} items)</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-4">
                        <span className="text-2xl flex-shrink-0">{CATEGORY_EMOJI[item.category] || '📦'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{item.productName}</p>
                          <p className="text-xs text-gray-500">KES {item.unitPrice.toLocaleString()}/{item.unit}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-red-100 text-red-600 rounded-lg font-black text-sm flex items-center justify-center">−</button>
                          <span className="font-black text-sm w-5 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-7 h-7 bg-green-100 text-green-600 rounded-lg font-black text-sm flex items-center justify-center">+</button>
                        </div>
                        <p className="text-sm font-black text-green-700 w-16 text-right flex-shrink-0">
                          KES {(item.unitPrice * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-green-50 border-t border-green-100 flex justify-between items-center">
                    <span className="font-black text-gray-900">Total</span>
                    <span className="font-black text-green-700 text-xl">KES {cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment method */}
                <div className="bg-white rounded-2xl p-4">
                  <p className="text-sm font-bold text-gray-700 mb-3">Payment Method</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'mpesa', label: '📱 M-Pesa', desc: 'Pay via M-Pesa STK push' },
                      { id: 'cash', label: '💵 Cash', desc: 'Pay at SACCO office' }
                    ].map(pm => (
                      <button
                        key={pm.id}
                        onClick={() => setPayMethod(pm.id as any)}
                        className={`p-3 rounded-xl border-2 text-left ${payMethod === pm.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                      >
                        <p className="font-bold text-sm">{pm.label}</p>
                        <p className="text-xs text-gray-500">{pm.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                  <p className="text-xs text-blue-700">
                    📱 M-Pesa prompt will be sent to: <strong>{member?.phoneNumber}</strong>
                  </p>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={orderLoading}
                  className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2"
                >
                  {orderLoading ? <><Spinner size={5} /> Processing...</> : `Place Order — KES ${cartTotal.toLocaleString()}`}
                </button>

                <button
                  onClick={() => setCart([])}
                  className="w-full text-red-400 text-sm font-medium py-2"
                >
                  🗑️ Clear Cart
                </button>
              </>
            )}
          </div>
        )}

        {/* ── ORDERS VIEW ──────────────────────────────────────────────────── */}
        {view === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-bold text-gray-700">No orders yet</p>
                <button
                  onClick={() => setView('shop')}
                  className="mt-4 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                >
                  Start Shopping →
                </button>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-green-700">{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">
                        {order.orderedAt
                          ? new Date(order.orderedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600'}`}>
                      {order.status}
                    </span>
                  </div>
                  {(order.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{item.product?.productName} × {item.quantity}</span>
                      <span>KES {Number(item.subtotal).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500 capitalize">{order.paymentMethod}</span>
                    <span className="font-black text-green-700">KES {Number(order.totalAmount).toLocaleString()}</span>
                  </div>
                  {order.status === 'pending' && (
                    <p className="text-xs text-orange-600 mt-2 font-medium">
                      ⏳ Awaiting confirmation from SACCO
                    </p>
                  )}
                  {order.status === 'delivered' && (
                    <p className="text-xs text-green-600 mt-2 font-medium">
                      ✅ Delivered
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}