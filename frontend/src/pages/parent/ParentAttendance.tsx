import { useParentAttendance } from "../../api/parent"
import { Badge, Card, PageTitle, Spinner } from "../../components/ui"

export function ParentAttendance() {
  const { data, isLoading } = useParentAttendance()

  if (isLoading) return <Spinner />

  return (
    <div>
      <PageTitle>Attendance</PageTitle>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Subject</th>
              <th className="px-4 py-2">Teacher</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((record) => (
              <tr key={record.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{record.date}</td>
                <td className="px-4 py-2">{record.subject_name}</td>
                <td className="px-4 py-2">{record.teacher_name}</td>
                <td className="px-4 py-2">
                  <Badge status={record.status} />
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No attendance records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
