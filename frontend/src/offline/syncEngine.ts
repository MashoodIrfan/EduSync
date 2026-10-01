import { apiClient } from "../api/client"
import { offlineDB, type AttendanceStatus, type QueuedAttendance } from "./db"

let syncInFlight = false

interface EnqueueInput {
  teacherId: number
  student: number
  studentLabel: string
  classRoom: number
  subject: number
  classLabel: string
  subjectLabel: string
  date: string
  status: AttendanceStatus
  remark?: string
}

export async function enqueueAttendance(input: EnqueueInput): Promise<number> {
  return offlineDB.attendanceQueue.add({
    ...input,
    queuedAt: new Date().toISOString(),
    syncStatus: "pending",
  })
}

function extractSyncError(error: unknown): { message: string; isConflict: boolean } {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: unknown; status?: number } }).response
    const data = response?.data

    if (data && typeof data === "object") {
      const firstKey = Object.keys(data)[0]
      const value = firstKey ? (data as Record<string, unknown>)[firstKey] : undefined
      const text = Array.isArray(value) ? value.join(" ") : String(value ?? "")

      // Re-marking your own earlier entry (e.g. present -> absent) is
      // a normal update now, not a conflict — the backend only still
      // rejects this when the existing record belongs to a *different*
      // teacher, which is the one real conflict case left.
      const lowerText = text.toLowerCase()
      const isConflict = firstKey === "date" && lowerText.includes("marked by another teacher")

      return { message: text || "This attendance entry was rejected.", isConflict }
    }
  }

  return { message: "This attendance entry was rejected.", isConflict: false }
}

async function syncOne(item: QueuedAttendance): Promise<void> {
  await offlineDB.attendanceQueue.update(item.id!, { syncStatus: "syncing" })

  try {
    const response = await apiClient.post("/teacher/attendance/", {
      student: item.student,
      class_room: item.classRoom,
      subject: item.subject,
      date: item.date,
      status: item.status,
      remark: item.remark ?? "",
    })

    await offlineDB.attendanceQueue.update(item.id!, {
      syncStatus: "synced",
      serverId: response.data.id,
      syncError: undefined,
    })
  } catch (error) {
    if (typeof error === "object" && error !== null && "response" in error) {
      // The server responded (even if with an error) — this is a real
      // data problem, not a connectivity one, so don't keep retrying
      // blindly.
      const { message, isConflict } = extractSyncError(error)

      await offlineDB.attendanceQueue.update(item.id!, {
        syncStatus: isConflict ? "conflict" : "failed",
        syncError: message,
      })
    } else {
      // No response at all — offline or the request never reached the
      // server. Leave it pending so the next sync pass retries it.
      await offlineDB.attendanceQueue.update(item.id!, { syncStatus: "pending" })
    }
  }
}

export async function trySyncAll(teacherId: number): Promise<void> {
  if (syncInFlight || !navigator.onLine) return

  syncInFlight = true

  try {
    const pending = await offlineDB.attendanceQueue
      .where({ teacherId })
      .filter((item) => item.syncStatus === "pending")
      .toArray()

    for (const item of pending) {
      // eslint-disable-next-line no-await-in-loop -- sequential to avoid
      // duplicate submissions racing against the same-day unique constraint.
      await syncOne(item)
    }
  } finally {
    syncInFlight = false
  }
}

export async function retryItem(teacherId: number, id: number): Promise<void> {
  await offlineDB.attendanceQueue.update(id, { syncStatus: "pending", syncError: undefined })
  await trySyncAll(teacherId)
}

export async function discardItem(id: number): Promise<void> {
  await offlineDB.attendanceQueue.delete(id)
}
