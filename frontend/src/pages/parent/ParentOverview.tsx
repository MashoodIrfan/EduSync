import { GraduationCap, IdCard, School } from "lucide-react"

import { useAuth } from "../../auth/AuthContext"
import { useParentProfile } from "../../api/parent"
import { Card, PageTitle, Spinner } from "../../components/ui"

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof School
  label: string
  value: string
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon size={20} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        <p className="truncate text-base font-semibold text-gray-900">{value}</p>
      </div>
    </Card>
  )
}

export function ParentOverview() {
  const { user } = useAuth()
  const { data: profile, isLoading } = useParentProfile()

  if (isLoading) return <Spinner />
  if (!profile) return null

  return (
    <div>
      <PageTitle subtitle="Here's what's happening with your child at school.">
        Welcome back, {user?.firstName || user?.username}
      </PageTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={GraduationCap} label="Student" value={profile.student_name} />
        <StatTile icon={IdCard} label="Student ID" value={profile.student_id} />
        <StatTile icon={School} label="Class" value={profile.class_name} />
      </div>
    </div>
  )
}
