import { ArrowRight, BookOpen, CalendarCheck, ClipboardList, CloudOff, Layers } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect } from "react"
import { Link } from "react-router-dom"

import { useAuth } from "../../auth/AuthContext"
import { useTeacherAssignments, useTeacherAttendance } from "../../api/teacher"
import { Badge, Card, EmptyState, Spinner } from "../../components/ui"
import { DashboardHeader, StatCard } from "../../components/widgets"
import { offlineDB } from "../../offline/db"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function TeacherAssignments() {
  const { user } = useAuth()
  const teacherId = user?.id

  const { data: networkAssignments, isLoading, isError } = useTeacherAssignments()
  const { data: attendance, isLoading: attendanceLoading } = useTeacherAttendance()

  const cachedAssignments = useLiveQuery(async () => {
    if (teacherId === undefined) return undefined

    return offlineDB.assignmentsCache.get(teacherId)
  }, [teacherId])

  useEffect(() => {
    if (!teacherId || !networkAssignments) return

    offlineDB.assignmentsCache.put({
      teacherId,
      assignments: networkAssignments,
      cachedAt: new Date().toISOString(),
    })
  }, [teacherId, networkAssignments])

  const usingCache = isError && !!cachedAssignments
  const assignments = usingCache ? cachedAssignments?.assignments : networkAssignments

  if (isLoading) return <Spinner />

  const subjectCount = new Set(assignments?.map((item) => item.subject_name)).size
  const markedToday = attendance?.filter((record) => record.date === todayIso()).length ?? 0
  const recentAttendance = [...(attendance ?? [])].slice(0, 5)

  return (
    <div>
      <DashboardHeader
        greeting={`Welcome back, ${user?.firstName || user?.username}`}
        subtitle="Here's your teaching overview for today."
        schoolName={user?.tenantName}
      />

      {usingCache && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-800">
          <CloudOff size={16} />
          You're offline — showing classes cached from {new Date(cachedAssignments!.cachedAt).toLocaleString()}.
        </div>
      )}

      {isError && !cachedAssignments && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <CloudOff size={16} />
          Couldn't load your classes. Check your connection and try reloading.
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Layers} label="Classes Assigned" value={assignments?.length ?? 0} tone="brand" />
        <StatCard icon={BookOpen} label="Subjects Taught" value={subjectCount} tone="blue" />
        <StatCard
          icon={CalendarCheck}
          label="Marked Today"
          value={attendanceLoading ? "…" : markedToday}
          tone="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <p className="mb-3 text-sm font-semibold text-gray-900">My Classes</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {assignments?.map((assignment) => (
              <Card key={assignment.id} className="group">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <BookOpen size={18} strokeWidth={2} />
                </div>
                <p className="text-xs font-medium text-gray-400">{assignment.class_name}</p>
                <p className="mb-4 text-base font-semibold text-gray-900">{assignment.subject_name}</p>
                <Link
                  to={`/teacher/mark-attendance/${assignment.class_id}/${assignment.subject_id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition group-hover:gap-1.5 hover:text-brand-800"
                >
                  Mark Attendance
                  <ArrowRight size={15} />
                </Link>
              </Card>
            ))}
            {assignments?.length === 0 && (
              <Card className="col-span-full">
                <EmptyState>No class assignments yet.</EmptyState>
              </Card>
            )}
          </div>
        </div>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Recent Activity</p>
            <Link to="/teacher/attendance" className="text-xs font-medium text-brand-600 hover:text-brand-800">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentAttendance.map((record) => (
              <div key={record.id} className="flex items-start gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <ClipboardList size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900">{record.student_name}</p>
                  <p className="text-xs text-gray-400">
                    {record.subject_name} · {record.date}
                  </p>
                </div>
                <Badge status={record.status} />
              </div>
            ))}
            {recentAttendance.length === 0 && <p className="text-sm text-gray-400">No attendance marked yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
