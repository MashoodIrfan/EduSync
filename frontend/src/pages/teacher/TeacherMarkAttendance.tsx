import { CloudOff, RefreshCw, WifiOff } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"

import { useAuth } from "../../auth/AuthContext"
import {
  useAttendanceStatusChanges,
  useTeacherAssignments,
  useTeacherAttendance,
  useTeacherClassStudents,
} from "../../api/teacher"
import { Badge, Button, Card, ErrorBanner, PageTitle, Select, Spinner } from "../../components/ui"
import { offlineDB, rosterCacheKey, type QueuedAttendance } from "../../offline/db"
import { useCachedRoster, useOnlineStatus, useSyncQueue } from "../../offline/hooks"
import { enqueueAttendance, trySyncAll } from "../../offline/syncEngine"

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "LATE"] as const

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

// Built from explicit UTC components (Date.UTC), never by parsing
// "YYYY-MM-DDT00:00:00" and letting the browser interpret it as local
// time — that round-trip silently shifts the date by a day in any
// timezone ahead of UTC once converted back via toISOString().
function formatDate(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

const SYNC_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "Queued", className: "text-amber-600" },
  syncing: { text: "Syncing…", className: "text-blue-600" },
  synced: { text: "Saved ✓", className: "text-emerald-600" },
  failed: { text: "Failed", className: "text-red-600" },
  conflict: { text: "Conflict", className: "text-red-600" },
}

export function TeacherMarkAttendance() {
  const { classId, subjectId } = useParams()
  const classIdNum = Number(classId)
  const subjectIdNum = Number(subjectId)
  const [date, setDate] = useState(todayIso())
  const isToday = date === todayIso()

  const { user } = useAuth()
  const teacherId = user?.id
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()

  const { data: assignments } = useTeacherAssignments()
  const { data: networkStudents, isLoading, isError } = useTeacherClassStudents(classIdNum)
  const { data: todaysAttendance } = useTeacherAttendance({
    class_room: classIdNum,
    subject: subjectIdNum,
    date,
  })
  const { data: recentChanges } = useAttendanceStatusChanges()
  const cachedRoster = useCachedRoster(teacherId, classIdNum, subjectIdNum)
  const queue = useSyncQueue(teacherId)

  const [statusByStudent, setStatusByStudent] = useState<Record<number, string>>({})
  const [remarkByStudent, setRemarkByStudent] = useState<Record<number, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [justSaved, setJustSaved] = useState(false)

  // Unsaved edits belong to whichever date they were typed against —
  // carrying them across a day change would silently apply one day's
  // in-progress edits to another day's (read-only, for past days)
  // records.
  useEffect(() => {
    setStatusByStudent({})
    setRemarkByStudent({})
    setJustSaved(false)
  }, [date])

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

  const existingByStudent = useMemo(() => {
    const map = new Map<number, { status: string; remark: string }>()

    for (const record of todaysAttendance ?? []) {
      // The id on a student row is academics.Student's own id — the
      // backend's TeacherAttendanceSerializer only returns
      // student_id (the school's human-readable code) by name, so we
      // match on that instead.
      map.set(
        students?.find((s) => s.student_id === record.student_id)?.id ?? -1,
        { status: record.status, remark: record.remark },
      )
    }

    return map
  }, [todaysAttendance, students])

  const queueByStudent = useMemo(() => {
    const map = new Map<number, QueuedAttendance>()

    for (const item of queue ?? []) {
      if (item.classRoom === classIdNum && item.subject === subjectIdNum && item.date === date) {
        map.set(item.student, item)
      }
    }

    return map
  }, [queue, classIdNum, subjectIdNum, date])

  function statusFor(studentId: number) {
    return statusByStudent[studentId] ?? existingByStudent.get(studentId)?.status ?? "PRESENT"
  }

  function remarkFor(studentId: number) {
    return remarkByStudent[studentId] ?? existingByStudent.get(studentId)?.remark ?? ""
  }

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

  async function handleSaveAll() {
    if (!teacherId || !assignment || !students || !isToday) return

    setIsSaving(true)
    setSaveError("")
    setJustSaved(false)

    try {
      for (const student of students) {
        const remark = remarkFor(student.id).trim()

        // eslint-disable-next-line no-await-in-loop -- queuing writes to
        // the same IndexedDB table; keep them sequential for simplicity.
        await enqueueAttendance({
          teacherId,
          student: student.id,
          studentLabel: `${student.student_name} (${student.student_id})`,
          classRoom: classIdNum,
          subject: subjectIdNum,
          classLabel: assignment.class_name,
          subjectLabel: assignment.subject_name,
          date,
          status: statusFor(student.id) as "PRESENT" | "ABSENT" | "LATE",
          remark: remark || undefined,
        })
      }

      if (navigator.onLine) {
        await trySyncAll(teacherId)

        // trySyncAll talks to the server directly via axios, outside
        // React Query entirely, so these cached queries never find out
        // a sync happened on their own — without this, status changes
        // and today's pre-filled statuses would look stale until an
        // unrelated refetch happened to occur.
        queryClient.invalidateQueries({ queryKey: ["teacher", "attendance"] })
      }

      setJustSaved(true)
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      setSaveError(`Couldn't save locally: ${detail}`)
    } finally {
      setIsSaving(false)
    }
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

      <ErrorBanner message={saveError} />

      {!isToday && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-600">
          Viewing a past date — attendance can only be marked or changed for today.
        </div>
      )}

      <Card className="mb-4 max-w-xs">
        <label className="block text-xs font-medium text-gray-600">Date</label>
        <input
          type="date"
          value={date}
          max={todayIso()}
          onChange={(event) => event.target.value && setDate(event.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <p className="mt-1 text-xs text-gray-400">
          {formatDate(date)} {isToday && "(today)"}
        </p>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Student ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Remark</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {students?.map((student) => {
              const queued = queueByStudent.get(student.id)
              const label = queued ? SYNC_LABEL[queued.syncStatus] : null
              const existing = existingByStudent.get(student.id)

              if (!isToday) {
                return (
                  <tr key={student.id} className="border-b border-gray-100">
                    <td className="px-4 py-2">{student.student_id}</td>
                    <td className="px-4 py-2">{student.student_name}</td>
                    <td className="px-4 py-2">
                      {existing ? (
                        <Badge status={existing.status} />
                      ) : (
                        <span className="text-xs text-gray-400">Not marked</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-500">{existing?.remark || "—"}</td>
                    <td className="px-4 py-2"></td>
                  </tr>
                )
              }

              return (
                <tr key={student.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">{student.student_id}</td>
                  <td className="px-4 py-2">{student.student_name}</td>
                  <td className="px-4 py-2">
                    <Select
                      value={statusFor(student.id)}
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
                    <input
                      type="text"
                      value={remarkFor(student.id)}
                      onChange={(event) =>
                        setRemarkByStudent((prev) => ({ ...prev, [student.id]: event.target.value }))
                      }
                      placeholder="Optional"
                      className="w-full min-w-[10rem] rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
                    />
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

      {isToday && students && students.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSaveAll} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save Attendance"}
          </Button>
          {justSaved && !isSaving && (
            <span className="text-sm font-medium text-emerald-600">Saved for the whole class ✓</span>
          )}
        </div>
      )}

      {isToday && teacherId && (
        <button
          onClick={() => trySyncAll(teacherId)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
        >
          <RefreshCw size={13} />
          Sync now
        </button>
      )}

      {!!recentChanges?.length && (
        <Card className="mt-6">
          <p className="mb-3 text-sm font-semibold text-gray-900">Recent Activity</p>
          <div className="space-y-2.5">
            {recentChanges.map((change) => (
              <div key={change.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">
                  {change.student_name}{" "}
                  <span className="text-gray-400">
                    · {change.subject_name} · {change.date}
                  </span>
                </span>
                <span className="font-medium text-gray-900">
                  {change.previous_status} <span className="text-gray-400">→</span> {change.new_status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
