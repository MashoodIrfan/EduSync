import { Eye, EyeOff, Lock, User } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"

import { useAuth } from "../auth/AuthContext"
import { Logo } from "../components/Logo"
import { Button, ErrorBanner } from "../components/ui"
import loginHero from "../assets/login-hero.jpg"

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
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <img
        src={loginHero}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-md"
      />
      <div className="absolute inset-0 bg-brand-900/50" />

      <div className="relative w-full max-w-md rounded-3xl bg-white/90 p-10 shadow-2xl backdrop-blur-xl">
        <div className="mb-9 flex items-center gap-3">
          <Logo size={36} />
          <span className="text-xl font-semibold tracking-tight text-gray-900">EduSync</span>
        </div>

        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-gray-900">Welcome back!</h1>
        <p className="mb-9 text-base text-gray-500">Sign in to continue to your portal.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <ErrorBanner message={error} />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">Username</label>
            <div className="relative">
              <User size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                required
                className="w-full rounded-lg border border-gray-300 bg-white py-3.5 pl-11 pr-3 text-base transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">Password</label>
            <div className="relative">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-gray-300 bg-white py-3.5 pl-11 pr-11 text-base transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full !py-3.5 !text-base !bg-gradient-to-r !from-brand-600 !to-brand-500 shadow-md shadow-brand-200"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </Button>
        </form>

        <p className="mt-9 text-center text-sm text-gray-400">© {new Date().getFullYear()} EduSync</p>
      </div>
    </div>
  )
}
