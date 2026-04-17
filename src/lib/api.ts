import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://igembe-backend.onrender.com'

// Cache store
const cache = new Map<string, { data: any; timestamp: number; etag?: string }>()
const CACHE_TTL = 15000 // 15 seconds for fast refresh feel

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 25000
})

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('mobile_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    if (
      (error.code === 'ECONNABORTED' || !error.response || error.response?.status >= 500) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true
      await new Promise(resolve => setTimeout(resolve, 2000))
      return api(originalRequest)
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('mobile_token')
      localStorage.removeItem('mobile-store')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Smart cached GET with auto-refresh
export async function smartGet(url: string, forceFresh = false) {
  const cached = cache.get(url)
  const now = Date.now()

  if (!forceFresh && cached && (now - cached.timestamp) < CACHE_TTL) {
    return { data: cached.data, fromCache: true }
  }

  const response = await api.get(url)
  cache.set(url, { data: response.data, timestamp: now })
  return { data: response.data, fromCache: false }
}

export function clearCache(urlPrefix?: string) {
  if (urlPrefix) {
    cache.forEach((_, key) => {
      if (key.startsWith(urlPrefix)) cache.delete(key)
    })
  } else {
    cache.clear()
  }
}

// Auto-polling hook helper
export function createPoller(url: string, callback: (data: any) => void, intervalMs = 30000) {
  let intervalId: ReturnType<typeof setInterval>

  const poll = async () => {
    try {
      const result = await smartGet(url, true)
      callback(result.data)
    } catch (err) {
      console.error('Polling error:', err)
    }
  }

  poll() // Immediate first call
  intervalId = setInterval(poll, intervalMs)

  return () => clearInterval(intervalId) // Cleanup function
}

export default api