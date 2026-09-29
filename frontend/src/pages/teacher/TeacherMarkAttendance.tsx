import { CloudOff, RefreshCw, WifiOff } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"

import { useAuth } from "../../auth/AuthContext"
import { useTeacherAssignments, useTeacherClassStudents } from "../../api/teacher"
import { Button, Card, PageTitle, Select, Spinner } from "../../components/ui"
import { offlineDB, rosterCacheKey, type QueuedAttendance } from "../../offline/db"
import { useCachedRoster, useOnlineStatus, useSyncQueue } from "../../offline/hooks"
import { enqueueAttendance, trySyncAll } from "../../offline/syncEngine"

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "LATE"] as const

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

const SYNC_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "Queued — will sync", className: "text-amber-600" },
  syncing: { text: "Syncing…", className: "text-blue-600" },
  synced: { text: "Synced ✓", className: "text-emerald-600" },
  failed: { text: "Failed", className: "text-red-600" },
  conflict: { text: "Conflict — already exists", className: "text-red-600" },
}

export function TeacherMarkAttendance() {
  const { classId, subjectId } = useParams()
  const classIdNum = Number(classId)
  const subjectIdNum = Number(subjectId)

  const { user } = useAuth()
  const teacherId = user?.id
  const isOnline = useOnlineStatus()

  const { data: assignments } = useTeacherAssignments()
  const { data: networkStudents, isLoading, isError } = useTeacherClassStudents(classIdNum)
  const cachedRoster = useCachedRoster(teacherId, classIdNum, subjectIdNum)
  const queue = useSyncQueue(teacherId)

  const [date, setDate] = useState(todayIso())
  const [statusByStudent, setStatusByStudent] = useState<Record<number, string>>({})
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null)

  const assignment = assignments?.find(
    (item) => item.class_id === classIdNum && item.subject_id === subjectIdNum,
  )

  // Cache the roster to IndexedDB whenever a fresh network fetch succeeds.
  useEffect(() => {
    if (!teacherId || !networkStudents || !assignment) return

    offlineDB.rosterCache.put({
      key: rosterCacheKey(teacherId, classIdNum, subjectIdNum),
      teacherId,
      classId: classIdNum,
      subjectId: subjectIdNum,
      className: assignment.class_name,
      subjectName: assignment.subject_name,
      students: networkStudents,
      cachedAt: new Date().toISOString(),
    })
  }, [teacherId, networkStudents, assignment, classIdNum, subjectIdNum])

  const usingCache = isError && !!cachedRoster
  const students = usingCache ? cachedRoster?.students : networkStudents

  const queueByStudent = useMemo(() => {
    const map = new Map<number, QueuedAttendance>()

    for (const item of queue ?? []) {
      if (item.classRoom === classIdNum && item.subject === subjectIdNum && item.date === date) {
        map.set(item.student, item)
      }
    }

    return map
  }, [queue, classIdNum, subjectIdNum, date])

  if (isLoading) return <Spinner />

  if (isError && !cachedRoster) {
    return (
      <div>
        <PageTitle>Mark Attendance</PageTitle>
        <Card className="flex flex-col items-center gap-2 py-10 text-center text-gray-500">
          <CloudOff size={24} className="text-gray-300" />
          <p className="text-sm">
            You're offline and no cached roster exists for this class yet. Open this page once while
            online to cache it for offline use.
          </p>
        </Card>
      </div>
    )
  }

  async function handleSave(studentId: number, studentLabel: string) {
    if (!teacherId || !assignment) return

    setSavingStudentId(studentId)

    await enqueueAttendance({
      teacherId,
      student: studentId,
      studentLabel,
      classRoom: classIdNum,
      subject: subjectIdNum,
      classLabel: assignment.class_name,
      subjectLabel: assignment.subject_name,
      date,
      status: (statusByStudent[studentId] ?? "PRESENT") as "PRESENT" | "ABSENT" | "LATE",
    })

    if (navigator.onLine) {
      await trySyncAll(teacherId)
    }

    setSavingStudentId(null)
  }

  return (
    <div>
      <PageTitle>
        Mark Attendance {assignment ? `— ${assignment.class_name} · ${assignment.subject_name}` : ""}
      </PageTitle>

      {!isOnline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          <WifiOff size={16} />
          You're offline. Attendance you save now is queued locally and will sync automatically once
          you're back online.
        </div>
      )}

      {usingCache && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-800">
          <CloudOff size={16} />
          Showing a cached roster from {new Date(cachedRoster!.cachedAt).toLocaleString()} (offline).
        </div>
      )}

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
            {students?.map((student) => {
              const queued = queueByStudent.get(student.id)
              const label = queued ? SYNC_LABEL[queued.syncStatus] : null

              return (
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
                    <Button
                      onClick={() => handleSave(student.id, `${student.student_name} (${student.student_id})`)}
                      disabled={savingStudentId === student.id || queued?.syncStatus === "synced"}
                    >
                      {queued?.syncStatus === "synced" ? "Saved" : "Save"}
                    </Button>
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {label && (
                      <span className={`font-medium ${label.className}`}>
                        {label.text}
                        {queued?.syncError ? `: ${queued.syncError}` : ""}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
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

      {teacherId && (
        <button
          onClick={() => trySyncAll(teacherId)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          <RefreshCw size={13} />
          Sync now
        </button>
      )}
    </div>
  )
}
