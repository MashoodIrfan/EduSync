import { Link } from "react-router-dom"

import { useTeacherAssignments } from "../../api/teacher"
import { Card, PageTitle, Spinner } from "../../components/ui"

export function TeacherAssignments() {
  const { data, isLoading } = useTeacherAssignments()

  if (isLoading) return <Spinner />

  return (
    <div>
      <PageTitle>My Classes</PageTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((assignment) => (
          <Card key={assignment.id}>
            <p className="text-sm text-gray-500">{assignment.class_name}</p>
            <p className="mb-3 text-lg font-semibold text-gray-900">{assignment.subject_name}</p>
            <Link
              to={`/teacher/mark-attendance/${assignment.class_id}/${assignment.subject_id}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              Mark Attendance →
            </Link>
          </Card>
        ))}
        {data?.length === 0 && (
          <Card className="col-span-full text-center text-gray-500">
            No class assignments yet.
          </Card>
        )}
      </div>
    </div>
  )
}
