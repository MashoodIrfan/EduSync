import { useState } from "react"

import { useAddAttendanceRemark, useTeacherAttendance } from "../../api/teacher"
import { Badge, Button, Card, ErrorBanner, Modal, PageTitle, Spinner, extractErrorMessage } from "../../components/ui"
import type { TeacherAttendanceInfo } from "../../types"

export function TeacherAttendanceHistory() {
  const { data, isLoading } = useTeacherAttendance()
  const [remarkTarget, setRemarkTarget] = useState<TeacherAttendanceInfo | null>(null)

  if (isLoading) return <Spinner />

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
              <th className="px-4 py-2"></th>
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
                <td className="px-4 py-2 text-right">
                  <Button variant="secondary" onClick={() => setRemarkTarget(record)}>
                    Add Remark
                  </Button>
                </td>
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

      {remarkTarget && (
        <RemarkModal record={remarkTarget} onClose={() => setRemarkTarget(null)} />
      )}
    </div>
  )
}

function RemarkModal({ record, onClose }: { record: TeacherAttendanceInfo; onClose: () => void }) {
  const addRemark = useAddAttendanceRemark()
  const [remark, setRemark] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit() {
    setError("")

    try {
      await addRemark.mutateAsync({ attendanceId: record.id, remark })
      onClose()
    } catch (err) {
      setError(extractErrorMessage(err))
    }
  }

  return (
    <Modal title={`Remark for ${record.student_name}`} onClose={onClose}>
      <ErrorBanner message={error} />
      <textarea
        value={remark}
        onChange={(event) => setRemark(event.target.value)}
        rows={4}
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        placeholder="Write a remark..."
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={addRemark.isPending || !remark.trim()}>
          Save Remark
        </Button>
      </div>
    </Modal>
  )
}
