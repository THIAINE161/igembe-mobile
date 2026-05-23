import axios from 'axios'

const BACKEND = import.meta.env.VITE_API_URL || 'https://igembe-backend.onrender.com'

const mobileApi = axios.create({
  baseURL: BACKEND,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    // Send user's timezone so backend can format dates correctly
    'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi'
  }
})

mobileApi.interceptors.request.use(config => {
  const token = localStorage.getItem('igembe_mobile_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  // Always include timezone
  config.headers['X-Timezone'] = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi'
  return config
}, err => Promise.reject(err))

mobileApi.interceptors.response.use(
  res => res,
  err => {
    // Do NOT auto-logout on network errors — only on explicit 401
    if (err.response?.status === 401) {
      const path = window.location.pathname
      if (!path.includes('/login') && !path.includes('/forgot-pin') && !path.includes('/reset-pin')) {
        localStorage.removeItem('igembe_mobile_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default mobileApi