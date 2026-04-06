import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://igembe-backend.onrender.com'

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
      await new Promise(resolve => setTimeout(resolve, 3000))
      return api(originalRequest)
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('mobile_token')
      localStorage.removeItem('mobile_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api