import { AlertTriangle, Eye, EyeOff, Loader2, X } from "lucide-react"
import { useState } from "react"
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
  const variants = {
    primary: "bg-brand-600 text-white shadow-sm shadow-brand-200 hover:bg-brand-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
  }

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${props.className ?? ""}`}
    />
  )
}

export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${props.className ?? ""}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 ${props.className ?? ""}`}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-100 ${className}`}>
      {children}
    </div>
  )
}

export function PageTitle({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-semibold tracking-tight text-gray-900">{children}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}

export function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PRESENT: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    SUCCESS: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    LATE: "bg-amber-50 text-amber-700 ring-amber-600/20",
    PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
    VERIFICATION_REQUIRED: "bg-amber-50 text-amber-700 ring-amber-600/20",
    INITIATED: "bg-blue-50 text-blue-700 ring-blue-600/20",
    ABSENT: "bg-terracotta-50 text-terracotta-700 ring-terracotta-600/20",
    OVERDUE: "bg-red-50 text-red-700 ring-red-600/20",
    FAILED: "bg-red-50 text-red-700 ring-red-600/20",
    CANCELLED: "bg-gray-100 text-gray-600 ring-gray-500/20",
    UNPAID: "bg-gray-100 text-gray-700 ring-gray-500/20",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        colors[status] ?? "bg-gray-100 text-gray-700 ring-gray-500/20"
      }`}
    >
      {status}
    </span>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-sm text-gray-400">
      <Loader2 size={16} className="animate-spin" />
      Loading...
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-gray-400">{children}</div>
}

export function LoadError({
  message = "Couldn't load this page. Check your connection and try again.",
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-14 text-center">
      <AlertTriangle size={20} className="text-red-500" />
      <p className="max-w-sm text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null

  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
      {message}
    </div>
  )
}

export function SuccessBanner({ message }: { message: string }) {
  if (!message) return null

  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
      {message}
    </div>
  )
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function extractErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: unknown } }).response
    const data = response?.data

    if (typeof data === "string") return data

    // DRF serializes a bare `raise ValidationError("message")` as a
    // top-level JSON array, not an object — e.g. ["message"]. Handle
    // that before the generic object branch below, which would
    // otherwise treat the array's "0" index as if it were a field
    // name and prefix the message with a meaningless "0: ".
    if (Array.isArray(data) && data.length > 0) {
      return String(data[0])
    }

    if (data && typeof data === "object") {
      if ("detail" in data && typeof (data as { detail?: unknown }).detail === "string") {
        return (data as { detail: string }).detail
      }

      const firstKey = Object.keys(data)[0]
      if (firstKey) {
        const value = (data as Record<string, unknown>)[firstKey]
        const text = Array.isArray(value) ? value.join(" ") : String(value)
        return `${firstKey}: ${text}`
      }
    }
  }

  return "Something went wrong. Please try again."
}
