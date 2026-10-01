import { useState } from "react"

import { useParentAttendance } from "../../api/parent"
import { Badge, Card, LoadError, Modal, PageTitle, Spinner } from "../../components/ui"
import type { AttendanceRecordInfo } from "../../types"

const TRUNCATE_AT = 28

export function ParentAttendance() {
  const { data, isLoading, isError, refetch } = useParentAttendance()
  const [openRemark, setOpenRemark] = useState<AttendanceRecordInfo | null>(null)

  if (isLoading) return <Spinner />
  if (isError) return <LoadError onRetry={() => refetch()} />

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
              <th className="px-4 py-2">Remark</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((record) => {
              const remark = record.remark
              const isLong = remark.length > TRUNCATE_AT

              return (
                <tr key={record.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">{record.date}</td>
                  <td className="px-4 py-2">{record.subject_name}</td>
                  <td className="px-4 py-2">{record.teacher_name}</td>
                  <td className="px-4 py-2">
                    <Badge status={record.status} />
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {remark ? (
                      isLong ? (
                        <button
                          onClick={() => setOpenRemark(record)}
                          className="text-left text-brand-600 underline decoration-dotted underline-offset-2 hover:text-brand-800"
                        >
                          {remark.slice(0, TRUNCATE_AT)}…
                        </button>
                      ) : (
                        remark
                      )
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              )
            })}
            {data?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No attendance records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {openRemark && (
        <Modal
          title={`${openRemark.subject_name} · ${openRemark.date}`}
          onClose={() => setOpenRemark(null)}
        >
          <p className="text-sm text-gray-700">{openRemark.remark}</p>
        </Modal>
      )}
    </div>
  )
}
