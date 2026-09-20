import axios, { type AxiosRequestConfig } from "axios"

import { tokenStorage } from "./tokenStorage"

export const apiClient = axios.create({ baseURL: "/api" })

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) {
    throw new Error("No refresh token available")
  }

  // Plain axios (not apiClient) so this call never re-triggers the
  // response interceptor below.
  const response = await axios.post("/api/token/refresh/", { refresh })
  const newAccess = response.data.access as string
  tokenStorage.setAccess(newAccess)
  return newAccess
}

interface RetryableConfig extends AxiosRequestConfig {
  _retry?: boolean
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableConfig | undefined

    const isAuthEndpoint = originalRequest?.url?.includes("/token/")

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true

      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }

        const newAccess = await refreshPromise

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${newAccess}`,
        }

        return apiClient(originalRequest)
      } catch (refreshError) {
        tokenStorage.clear()
        window.location.href = "/login"
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  },
)
