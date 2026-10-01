import { CalendarCheck, CheckCircle2, Eye, EyeOff, GraduationCap, Lock, ShieldCheck, TrendingUp, User, Wallet } from "lucide-react"
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
    <div className="flex min-h-screen bg-stone-50">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-12 text-white lg:flex">
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

        <div className="relative flex flex-1 items-center justify-center py-8">
          <div className="relative h-64 w-full max-w-sm">
            <div
              className="pointer-events-none absolute inset-0 rounded-full bg-white/10 blur-3xl"
              aria-hidden="true"
            />

            <div className="absolute left-1/2 top-0 w-48 -translate-x-1/2 rounded-2xl bg-white/95 p-4 text-gray-900 shadow-xl backdrop-blur">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <TrendingUp size={16} />
                </span>
                <span className="text-xs font-medium text-gray-500">Attendance Rate</span>
              </div>
              <p className="text-2xl font-semibold">96%</p>
            </div>

            <div className="absolute bottom-4 left-0 w-44 -rotate-6 rounded-2xl bg-white/95 p-4 text-gray-900 shadow-xl backdrop-blur">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={16} />
                </span>
                <span className="text-xs font-medium text-gray-500">Fees Collected</span>
              </div>
              <p className="text-2xl font-semibold">Rs. 1.2M</p>
            </div>

            <div className="absolute bottom-10 right-0 w-40 rotate-6 rounded-2xl bg-white/95 p-4 text-gray-900 shadow-xl backdrop-blur">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-terracotta-50 text-terracotta-600">
                  <GraduationCap size={16} />
                </span>
                <span className="text-xs font-medium text-gray-500">Schools Onboard</span>
              </div>
              <p className="text-2xl font-semibold">12</p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="mb-4 text-3xl font-semibold leading-tight tracking-tight">
            School operations, run from one place.
          </h1>
          <p className="mb-8 text-brand-100">
            Attendance, remarks, fees, and payments — one platform for admins, teachers, and
            parents, with every school's data kept strictly separate.
          </p>

          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-xs text-brand-50">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon size={13} strokeWidth={2.25} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-8 text-xs text-brand-200">© {new Date().getFullYear()} EduSync</p>
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
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Password</label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full !py-2.5 shadow-sm shadow-brand-200"
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
