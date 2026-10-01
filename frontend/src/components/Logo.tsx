import { GraduationCap } from "lucide-react"

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm shadow-brand-200"
      style={{ width: size, height: size }}
    >
      <GraduationCap size={size * 0.55} strokeWidth={2.25} />
    </div>
  )
}
