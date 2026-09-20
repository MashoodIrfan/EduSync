import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"

import { useAuth } from "../auth/AuthContext"
import { Button, ErrorBanner, Field, Input } from "../components/ui"

const ROLE_HOME: Record<string, string> = {
  PARENT: "/parent",
  TEACHER: "/teacher",
  SCHOOL_ADMIN: "/school-admin",
  PLATFORM_ADMIN: "/platform-admin",
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to={ROLE_HOME[user.role] ?? "/login"} replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      await login(username, password)
      navigate("/")
    } catch {
      setError("Invalid username or password.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold text-gray-900">EduSync</h1>
        <p className="mb-6 text-center text-sm text-gray-500">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorBanner message={error} />

          <Field label="Username">
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  )
}
