import { ArrowRight, BookOpen } from "lucide-react"
import { Link } from "react-router-dom"

import { useAuth } from "../../auth/AuthContext"
import { useTeacherAssignments } from "../../api/teacher"
import { Card, EmptyState, PageTitle, Spinner } from "../../components/ui"

export function TeacherAssignments() {
  const { user } = useAuth()
  const { data, isLoading } = useTeacherAssignments()

  if (isLoading) return <Spinner />

  return (
    <div>
      <PageTitle subtitle="Pick a class to take attendance.">
        Welcome back, {user?.firstName || user?.username}
      </PageTitle>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((assignment) => (
          <Card key={assignment.id} className="group">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <BookOpen size={18} strokeWidth={2} />
            </div>
            <p className="text-xs font-medium text-gray-400">{assignment.class_name}</p>
            <p className="mb-4 text-base font-semibold text-gray-900">{assignment.subject_name}</p>
            <Link
              to={`/teacher/mark-attendance/${assignment.class_id}/${assignment.subject_id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition group-hover:gap-1.5 hover:text-indigo-800"
            >
              Mark Attendance
              <ArrowRight size={15} />
            </Link>
          </Card>
        ))}
        {data?.length === 0 && (
          <Card className="col-span-full">
            <EmptyState>No class assignments yet.</EmptyState>
          </Card>
        )}
      </div>
    </div>
  )
}
