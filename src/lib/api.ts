import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://igembe-backend.onrender.com'

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30 * 1000 // 30 seconds

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
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

// Cached GET requests for dashboard data
export async function cachedGet(url: string, ttl: number = CACHE_TTL) {
  const cached = cache.get(url)
  if (cached && Date.now() - cached.timestamp < ttl) {
    return { data: cached.data }
  }
  const response = await api.get(url)
  cache.set(url, { data: response.data, timestamp: Date.now() })
  return response
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

export default api