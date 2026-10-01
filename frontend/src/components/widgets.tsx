import type { ComponentType, ReactNode } from "react"
import { School } from "lucide-react"

import { Card } from "./ui"

// ---------------------------------------------------------------
// Radial progress ring — e.g. attendance rate, fee collection rate.
// ---------------------------------------------------------------

export function RadialProgress({
  value,
  size = 128,
  strokeWidth = 12,
  label,
  color = "#5e7163",
  trackColor = "#e4e9e0",
}: {
  value: number
  size?: number
  strokeWidth?: number
  label?: string
  color?: string
  trackColor?: string
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-gray-900">{Math.round(clamped)}%</span>
        </div>
      </div>
      {label && <p className="mt-2 text-xs font-medium text-gray-500">{label}</p>}
    </div>
  )
}

// ---------------------------------------------------------------
// Gradient-fill trend line — e.g. attendance/status over time.
// ---------------------------------------------------------------

export function TrendChart({
  points,
  height = 140,
  color = "#5e7163",
}: {
  points: { label: string; value: number }[]
  height?: number
  color?: string
}) {
  if (points.length === 0) {
    return <div className="flex h-[140px] items-center justify-center text-sm text-gray-400">No data yet.</div>
  }

  const width = 320
  const paddingX = 8
  const paddingTop = 12
  const paddingBottom = 24
  const plotHeight = height - paddingTop - paddingBottom
  const step = points.length > 1 ? (width - paddingX * 2) / (points.length - 1) : 0

  const coords = points.map((point, index) => {
    const x = paddingX + step * index
    const y = paddingTop + plotHeight * (1 - Math.max(0, Math.min(100, point.value)) / 100)
    return { x, y, ...point }
  })

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ")
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height - paddingBottom} L ${coords[0].x} ${
    height - paddingBottom
  } Z`

  const gradientId = "trend-gradient"

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c) => (
        <circle key={c.label} cx={c.x} cy={c.y} r={3} fill="white" stroke={color} strokeWidth={2} />
      ))}
      {coords.map((c) => (
        <text key={`${c.label}-label`} x={c.x} y={height - 6} textAnchor="middle" className="fill-gray-400" fontSize={10}>
          {c.label}
        </text>
      ))}
    </svg>
  )
}

// ---------------------------------------------------------------
// Stat card with an icon badge.
// ---------------------------------------------------------------

const TONES: Record<string, { bg: string; text: string }> = {
  brand: { bg: "bg-brand-50", text: "text-brand-600" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-600" },
  red: { bg: "bg-red-50", text: "text-red-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-600" },
}

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  value: ReactNode
  tone?: keyof typeof TONES
}) {
  const colors = TONES[tone]

  return (
    <Card className="flex items-center gap-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors.bg} ${colors.text}`}>
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="truncate text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------
// Small colored pill — e.g. priority/urgency tags.
// ---------------------------------------------------------------

export function Pill({ tone, children }: { tone: "red" | "amber" | "emerald" | "gray"; children: ReactNode }) {
  const colors: Record<string, string> = {
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
    gray: "bg-gray-100 text-gray-600",
  }

  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[tone]}`}>{children}</span>
}

// ---------------------------------------------------------------
// Dashboard header: greeting + live date.
// ---------------------------------------------------------------

export function DashboardHeader({
  greeting,
  subtitle,
  schoolName,
}: {
  greeting: string
  subtitle?: string
  schoolName?: string | null
}) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{greeting}</h1>
          {schoolName && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
              <School size={12} strokeWidth={2.5} />
              {schoolName}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500">
        {today}
      </span>
    </div>
  )
}
