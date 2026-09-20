import { CalendarCheck, Lock, ShieldCheck, User, Wallet } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"

import { useAuth } from "../auth/AuthContext"
import { Logo } from "../components/Logo"
import { Button, ErrorBanner } from "../components/ui"

const ROLE_HOME: Record<string, string> = {
  PARENT: "/parent",
  TEACHER: "/teacher",
  SCHOOL_ADMIN: "/school-admin",
  PLATFORM_ADMIN: "/platform-admin",
}

const FEATURES = [
  { icon: ShieldCheck, text: "Every school's data stays fully isolated, tenant by tenant" },
  { icon: CalendarCheck, text: "Subject-level attendance, marked and reviewed in seconds" },
  { icon: Wallet, text: "Fee invoices and payments tracked end to end" },
]

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
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-500 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Logo size={28} />
          </div>
          <span className="text-lg font-semibold tracking-tight">EduSync</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="mb-4 text-3xl font-semibold leading-tight tracking-tight">
            School operations, run from one place.
          </h1>
          <p className="mb-10 text-indigo-100">
            Attendance, remarks, fees, and payments — one platform for admins, teachers, and
            parents, with every school's data kept strictly separate.
          </p>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-indigo-50">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon size={15} strokeWidth={2.25} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-200">© {new Date().getFullYear()} EduSync</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <Logo size={44} />
            <p className="mt-3 text-lg font-semibold text-gray-900">EduSync</p>
          </div>

          <h2 className="mb-1 text-2xl font-semibold text-gray-900">Welcome back</h2>
          <p className="mb-8 text-sm text-gray-500">Sign in to continue to your portal</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <ErrorBanner message={error} />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Username</label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  required
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full !py-2.5 shadow-sm shadow-indigo-200"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
