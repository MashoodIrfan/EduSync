import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom"

import { AuthProvider, useAuth } from "./auth/AuthContext"
import { LoginPage } from "./pages/LoginPage"

const queryClient = new QueryClient()

const ROLE_HOME: Record<string, string> = {
  PARENT: "/parent",
  TEACHER: "/teacher",
  SCHOOL_ADMIN: "/school-admin",
  PLATFORM_ADMIN: "/platform-admin",
}

function HomeRedirect() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return <Navigate to={ROLE_HOME[user.role] ?? "/login"} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}
