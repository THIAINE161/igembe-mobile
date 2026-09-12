import axios from 'axios'
import { useMobileStore } from '../store/mobileStore'

export const API_URL = import.meta.env.VITE_API_URL || 'https://igembe-backend.onrender.com'

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = useMobileStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle auth errors globally, and opportunistically pick up a refreshed
// token if the backend included one (see mobileAuth.ts login route) — checked
// generically on every response body so any endpoint can adopt this pattern
// later without another client-side change.
api.interceptors.response.use(
  (response) => {
    const refreshedToken = response.data?.refreshedToken
    if (refreshedToken && typeof refreshedToken === 'string') {
      useMobileStore.getState().setToken(refreshedToken)
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — log out
      useMobileStore.getState().logout()
    }
    return Promise.reject(error)
  }
)

export default api