import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Автоматически добавляем токен к каждому запросу
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Автоматически обновляем токен при 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const { data } = await axios.post(
          'http://localhost:3000/api/v1/auth/refresh',
          { refreshToken }
        )

        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return apiClient(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient