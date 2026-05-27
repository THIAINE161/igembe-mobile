import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMobileStore } from '../store/mobileStore'
import api from '../lib/api'

interface Product { id: string; productName: string; category: string; unit: string; unitPrice: number; stockQuantity: number; brand?: string; description?: string }
interface CartItem extends Product { quantity: number }

const CATEGORY_EMOJI: Record<string, string> = {
  fertilizer: '🌱', pesticide: '🧪', herbicide: '🌿',
  fungicide: '🍄', seed: '🌾', equipment: '🔧', other: '📦'
}

export default function AgrovetOrderPage() {
  const navigate = useNavigate()
  const { member } = useMobileStore()
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'shop'|'cart'|'orders'>('shop')
  const [orders, setOrders] = useState<any[]>([])
  const [payLoading, setPayLoading] = useState(false)
  const [paySuccess, setPaySuccess] = useState('')
  const [payError, setPayError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchProducts()
    fetchOrders()
  }, [])

  const fetchProducts = async () => {
    try {
      const r = await api.get('/api/agrovet/products/active')
      setProducts(r.data.data || [])
    } catch (e) { console.error('Failed to fetch products') }
    finally { setLoading(false) }
  }

  const fetchOrders = async () => {
    if (!member?.id) return
    try {
      const r = await api.get('/api/agrovet/orders')
      const all = r.data.data || []
      // Filter only this member's orders
      setOrders(all.filter((o: any) => o.memberId === member?.id))
    } catch (e) { console.error('Failed to fetch orders') }
  }

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id)
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
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

  const clearCart = () => setCart([])

  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)

  const handlePayMpesa = async () => {
    if (!cart.length) { setPayError('Cart is empty'); return }
    if (!member) { setPayError('Please login first'); return }

    // Get farmer phone number
    const farmerPhone = member.phoneNumber
    if (!farmerPhone) {
      setPayError('No phone number found. Please update your profile.')
      return
    }

    setPayLoading(true)
    setPayError('')
    setPaySuccess('')

    try {
      // Step 1: Create the order
      const orderRes = await api.post('/api/agrovet/orders', {
        memberId: member.id,
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        paymentMethod: 'mpesa',
        isCredit: false
      })

      const { id: orderId, orderNumber, totalAmount } = orderRes.data.data

      // Step 2: Trigger STK push with farmer's phone and amount
      const stkRes = await api.post('/api/mpesa/agrovet-payment', {
        phoneNumber: farmerPhone,    // Use farmer's actual phone
        amount: totalAmount || cartTotal,
        memberId: member.id,
        orderId,
        orderNumber
      })

      setPaySuccess(`M-Pesa prompt sent to ${farmerPhone}! Order: ${orderNumber}`)
      clearCart()
      setView('orders')
      await fetchOrders()
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Payment failed. Try again.'
      setPayError(msg)
    } finally {
      setPayLoading(false)
    }
  }

  const handleCashOrder = async () => {
    if (!cart.length) return
    if (!member) return
    setPayLoading(true)
    setPayError('')
    try {
      const orderRes = await api.post('/api/agrovet/orders', {
        memberId: member.id,
        items: cart.map(item => ({ productId: item.id, quantity: item.quantity, unitPrice: item.unitPrice })),
        paymentMethod: 'cash',
        isCredit: false
      })
      setPaySuccess(`Order ${orderRes.data.data.orderNumber} placed! Pay at SACCO office.`)
      clearCart()
      setView('orders')
      await fetchOrders()
    } catch (err: any) {
      setPayError(err.response?.data?.error || 'Order failed.')
    } finally {
      setPayLoading(false)
    }
  }

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))]

  const filteredProducts = products.filter(p => {
    const matchSearch = !search || p.productName.toLowerCase().includes(search.toLowerCase()) || (p.brand || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-green-800 to-green-600 px-5 pt-12 pb-6">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/farmer')} className="text-green-200 text-sm">← Back</button>
          <h1 className="text-white text-xl font-black">🌱 AgroVet Shop</h1>
          <button onClick={() => setView('cart')} className="relative">
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs font-black flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          {['shop', 'cart', 'orders'].map(v => (
            <button key={v} onClick={() => setView(v as any)}
              className={`px-4 py-2 rounded-xl text-sm font-bold capitalize ${view === v ? 'bg-white text-green-700' : 'bg-white bg-opacity-20 text-white'}`}>
              {v === 'cart' ? `🛒 Cart (${cartCount})` : v === 'shop' ? '🛍️ Shop' : '📋 My Orders'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {/* SHOP VIEW */}
        {view === 'shop' && (
          <div className="space-y-4">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search products..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-green-500 bg-white" />

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 capitalize ${selectedCategory === cat ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
                  {CATEGORY_EMOJI[cat] || ''} {cat}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-10">
                <svg className="animate-spin h-8 w-8 text-green-600 mx-auto" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <p className="text-4xl mb-3">🌱</p>
                <p className="font-bold text-gray-700">No products available</p>
                <p className="text-gray-400 text-sm">Check back later</p>
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
                        <p className="font-bold text-gray-900 text-sm leading-tight">{product.productName}</p>
                        {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                        <p className="text-green-700 font-black text-sm mt-1">KES {product.unitPrice.toLocaleString()}/{product.unit}</p>
                        <p className="text-xs text-gray-400">Stock: {product.stockQuantity}</p>

                        {inCart ? (
                          <div className="flex items-center justify-between mt-2">
                            <button onClick={() => removeFromCart(product.id)} className="w-8 h-8 bg-red-100 text-red-600 rounded-xl text-lg font-black flex items-center justify-center">−</button>
                            <span className="font-black text-gray-900">{inCart.quantity}</span>
                            <button onClick={() => addToCart(product)} disabled={inCart.quantity >= product.stockQuantity} className="w-8 h-8 bg-green-600 disabled:bg-green-300 text-white rounded-xl text-lg font-black flex items-center justify-center">+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(product)} disabled={product.stockQuantity === 0}
                            className="w-full mt-2 bg-green-600 disabled:bg-gray-200 text-white text-xs font-bold py-2 rounded-xl">
                            {product.stockQuantity === 0 ? 'Out of Stock' : '+ Add to Cart'}
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

        {/* CART VIEW */}
        {view === 'cart' && (
          <div className="space-y-4">
            {paySuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl text-sm font-medium">
                ✅ {paySuccess}
              </div>
            )}
            {payError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm flex justify-between">
                <span>⚠️ {payError}</span>
                <button onClick={() => setPayError('')} className="font-bold">×</button>
              </div>
            )}

            {cart.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <p className="text-5xl mb-4">🛒</p>
                <p className="font-bold text-gray-700">Cart is empty</p>
                <button onClick={() => setView('shop')} className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">Shop Now →</button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="font-black text-gray-900">Your Cart ({cartCount} items)</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-4">
                        <span className="text-2xl flex-shrink-0">{CATEGORY_EMOJI[item.category] || '📦'}</span>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">{item.productName}</p>
                          <p className="text-xs text-gray-500">KES {item.unitPrice.toLocaleString()}/{item.unit}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 bg-red-100 text-red-600 rounded-lg text-sm font-black flex items-center justify-center">−</button>
                          <span className="font-black text-sm w-6 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart(item)} className="w-7 h-7 bg-green-100 text-green-600 rounded-lg text-sm font-black flex items-center justify-center">+</button>
                        </div>
                        <p className="text-sm font-black text-green-700 w-20 text-right">KES {(item.unitPrice * item.quantity).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 bg-green-50 border-t border-green-100 flex justify-between items-center">
                    <span className="font-black text-gray-900">Total</span>
                    <span className="font-black text-green-700 text-xl">KES {cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Farmer phone info */}
                {member?.phoneNumber && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                    <p className="text-xs font-bold text-blue-800">📱 M-Pesa prompt will be sent to:</p>
                    <p className="text-blue-900 font-black">{member.phoneNumber}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <button onClick={handlePayMpesa} disabled={payLoading}
                    className="w-full bg-green-600 disabled:bg-green-300 text-white font-black py-4 rounded-2xl text-lg flex items-center justify-center gap-2">
                    {payLoading ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                    ) : '📱'}
                    {payLoading ? 'Processing...' : `Pay via M-Pesa — KES ${cartTotal.toLocaleString()}`}
                  </button>

                  <button onClick={handleCashOrder} disabled={payLoading}
                    className="w-full border-2 border-gray-200 text-gray-700 font-bold py-3 rounded-2xl">
                    💵 Pay at SACCO Office (Cash)
                  </button>

                  <button onClick={clearCart} className="w-full text-red-500 text-sm font-medium py-2">
                    🗑️ Clear Cart
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ORDERS VIEW */}
        {view === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="font-bold text-gray-700">No orders yet</p>
                <button onClick={() => setView('shop')} className="mt-3 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold">Start Shopping →</button>
              </div>
            ) : (
              orders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-black text-green-700">{order.orderNumber}</p>
                      <p className="text-xs text-gray-400">{order.orderedAt ? new Date(order.orderedAt).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' }) : '—'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>{order.status}</span>
                  </div>
                  <div className="space-y-1">
                    {(order.items || []).map((item: any, i: number) => (
                      <p key={i} className="text-xs text-gray-600">
                        {item.product?.productName} × {item.quantity} = KES {item.subtotal?.toLocaleString()}
                      </p>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                    <span className="text-sm text-gray-500 capitalize">{order.paymentMethod}</span>
                    <span className="font-black text-green-700">KES {Number(order.totalAmount).toLocaleString()}</span>
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