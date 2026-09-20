import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base = "rounded-md px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }

  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${props.className ?? ""}`}
    />
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${props.className ?? ""}`}
    />
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
      {children}
    </label>
  )
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-xl font-semibold text-gray-900">{children}</h1>
}

export function Badge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PRESENT: "bg-green-100 text-green-700",
    PAID: "bg-green-100 text-green-700",
    SUCCESS: "bg-green-100 text-green-700",
    LATE: "bg-yellow-100 text-yellow-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    VERIFICATION_REQUIRED: "bg-yellow-100 text-yellow-700",
    INITIATED: "bg-blue-100 text-blue-700",
    ABSENT: "bg-red-100 text-red-700",
    OVERDUE: "bg-red-100 text-red-700",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-200 text-gray-600",
    UNPAID: "bg-gray-200 text-gray-700",
  }

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  )
}

export function Spinner() {
  return <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null

  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  )
}

export function SuccessBanner({ message }: { message: string }) {
  if (!message) return null

  return (
    <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            ✕
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
