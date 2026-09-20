import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { jwtDecode } from "jwt-decode"

import { apiClient } from "../api/client"
import { tokenStorage } from "../api/tokenStorage"
import type { AuthUser, DecodedToken } from "../types"

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function decodeUser(accessToken: string): AuthUser {
  const decoded = jwtDecode<DecodedToken>(accessToken)

  return {
    id: decoded.user_id,
    role: decoded.role,
    tenantId: decoded.tenant_id,
    username: decoded.username,
    firstName: decoded.first_name,
    lastName: decoded.last_name,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const existingToken = tokenStorage.getAccess()

    if (existingToken) {
      try {
        setUser(decodeUser(existingToken))
      } catch {
        tokenStorage.clear()
      }
    }

    setIsLoading(false)
  }, [])

  async function login(username: string, password: string) {
    const response = await apiClient.post("/token/", { username, password })
    const { access, refresh } = response.data

    tokenStorage.setTokens(access, refresh)
    setUser(decodeUser(access))
  }

  function logout() {
    tokenStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context
}
