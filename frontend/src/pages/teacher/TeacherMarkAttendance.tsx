import { useState } from "react"
import { useParams } from "react-router-dom"

import { useMarkAttendance, useTeacherAssignments, useTeacherClassStudents } from "../../api/teacher"
import { Button, Card, ErrorBanner, PageTitle, Select, Spinner, SuccessBanner, extractErrorMessage } from "../../components/ui"

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "LATE"] as const

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function TeacherMarkAttendance() {
  const { classId, subjectId } = useParams()
  const classIdNum = Number(classId)
  const subjectIdNum = Number(subjectId)

  const { data: assignments } = useTeacherAssignments()
  const { data: students, isLoading } = useTeacherClassStudents(classIdNum)
  const markAttendance = useMarkAttendance()

  const [date, setDate] = useState(todayIso())
  const [statusByStudent, setStatusByStudent] = useState<Record<number, string>>({})
  const [feedback, setFeedback] = useState<Record<number, string>>({})

  const assignment = assignments?.find(
    (item) => item.class_id === classIdNum && item.subject_id === subjectIdNum,
  )

  if (isLoading) return <Spinner />

  async function handleSave(studentId: number) {
    setFeedback((prev) => ({ ...prev, [studentId]: "" }))

    try {
      await markAttendance.mutateAsync({
        student: studentId,
        class_room: classIdNum,
        subject: subjectIdNum,
        date,
        status: (statusByStudent[studentId] ?? "PRESENT") as "PRESENT" | "ABSENT" | "LATE",
      })
      setFeedback((prev) => ({ ...prev, [studentId]: "Saved." }))
    } catch (err) {
      setFeedback((prev) => ({ ...prev, [studentId]: extractErrorMessage(err) }))
    }
  }

  return (
    <div>
      <PageTitle>
        Mark Attendance {assignment ? `— ${assignment.class_name} · ${assignment.subject_name}` : ""}
      </PageTitle>

      <Card className="mb-4 max-w-xs">
        <label className="block text-xs font-medium text-gray-600">Date</label>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Student ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {students?.map((student) => (
              <tr key={student.id} className="border-b border-gray-100">
                <td className="px-4 py-2">{student.student_id}</td>
                <td className="px-4 py-2">{student.student_name}</td>
                <td className="px-4 py-2">
                  <Select
                    value={statusByStudent[student.id] ?? "PRESENT"}
                    onChange={(event) =>
                      setStatusByStudent((prev) => ({ ...prev, [student.id]: event.target.value }))
                    }
                    className="w-32"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-2">
                  <Button onClick={() => handleSave(student.id)} disabled={markAttendance.isPending}>
                    Save
                  </Button>
                </td>
                <td className="px-4 py-2 text-xs">
                  {feedback[student.id] === "Saved." ? (
                    <SuccessBanner message={feedback[student.id]} />
                  ) : (
                    <ErrorBanner message={feedback[student.id] ?? ""} />
                  )}
                </td>
              </tr>
            ))}
            {students?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No students in this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
