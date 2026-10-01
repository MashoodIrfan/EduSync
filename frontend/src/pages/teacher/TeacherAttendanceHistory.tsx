import { useTeacherAttendance } from "../../api/teacher"
import { Badge, Card, LoadError, PageTitle, Spinner } from "../../components/ui"

export function TeacherAttendanceHistory() {
  const { data, isLoading, isError, refetch } = useTeacherAttendance()

  if (isLoading) return <Spinner />
  if (isError) return <LoadError onRetry={() => refetch()} />

  return (
    <div>
      <PageTitle>Attendance History</PageTitle>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Class</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Remark</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((record) => (
              <tr key={record.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{record.date}</td>
                <td className="px-4 py-2">
                  {record.student_name} ({record.student_id})
                </td>
                <td className="px-4 py-2">{record.class_name}</td>
                <td className="px-4 py-2">{record.subject_name}</td>
                <td className="px-4 py-2">
                  <Badge status={record.status} />
                </td>
                <td className="px-4 py-2 text-gray-500">{record.remark || "—"}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No attendance marked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
