import { beforeEach, describe, expect, it, vi } from "vitest"

import { apiClient } from "../api/client"
import { offlineDB } from "./db"
import { discardItem, enqueueAttendance, retryItem, trySyncAll } from "./syncEngine"

vi.mock("../api/client", () => ({
  apiClient: { post: vi.fn() },
}))

const post = vi.mocked(apiClient.post)

function mockOnline(isOnline: boolean) {
  Object.defineProperty(navigator, "onLine", { value: isOnline, configurable: true })
}

const baseInput = {
  teacherId: 1,
  student: 10,
  studentLabel: "Jane Doe",
  classRoom: 2,
  subject: 3,
  classLabel: "Class A",
  subjectLabel: "Math",
  date: "2026-09-29",
  status: "PRESENT" as const,
}

describe("syncEngine", () => {
  beforeEach(async () => {
    post.mockReset()
    mockOnline(true)
    await offlineDB.attendanceQueue.clear()
  })

  it("enqueues an item as pending", async () => {
    const id = await enqueueAttendance(baseInput)
    const item = await offlineDB.attendanceQueue.get(id)

    expect(item?.syncStatus).toBe("pending")
    expect(item?.student).toBe(10)
  })

  it("marks a successfully synced item as synced with the server id", async () => {
    post.mockResolvedValueOnce({ data: { id: 999 } })
    const id = await enqueueAttendance(baseInput)

    await trySyncAll(1)

    const item = await offlineDB.attendanceQueue.get(id)
    expect(item?.syncStatus).toBe("synced")
    expect(item?.serverId).toBe(999)
  })

  it("does nothing when offline", async () => {
    mockOnline(false)
    await enqueueAttendance(baseInput)

    await trySyncAll(1)

    expect(post).not.toHaveBeenCalled()
  })

  it("leaves the item pending on a network error (no response) so it retries later", async () => {
    post.mockRejectedValueOnce(new Error("Network Error"))
    const id = await enqueueAttendance(baseInput)

    await trySyncAll(1)

    const item = await offlineDB.attendanceQueue.get(id)
    expect(item?.syncStatus).toBe("pending")
  })

  it("detects a conflict from the serializer's own explicit duplicate error", async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { date: "Attendance already exists for this date." } },
    })
    const id = await enqueueAttendance(baseInput)

    await trySyncAll(1)

    const item = await offlineDB.attendanceQueue.get(id)
    expect(item?.syncStatus).toBe("conflict")
    expect(item?.syncError).toContain("already exists")
  })

  it("detects a conflict from DRF's auto-generated UniqueTogetherValidator error", async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          non_field_errors: [
            "The fields student, class_room, subject, date must make a unique set.",
          ],
        },
      },
    })
    const id = await enqueueAttendance(baseInput)

    await trySyncAll(1)

    const item = await offlineDB.attendanceQueue.get(id)
    expect(item?.syncStatus).toBe("conflict")
  })

  it("marks a non-conflict server rejection as failed, not conflict", async () => {
    post.mockRejectedValueOnce({
      response: { status: 400, data: { status: "Invalid status." } },
    })
    const id = await enqueueAttendance(baseInput)

    await trySyncAll(1)

    const item = await offlineDB.attendanceQueue.get(id)
    expect(item?.syncStatus).toBe("failed")
  })

  it("syncs multiple pending items sequentially, not in parallel", async () => {
    const callOrder: number[] = []
    post.mockImplementation((_url, body) => {
      callOrder.push((body as { student: number }).student)
      return Promise.resolve({ data: { id: callOrder.length } })
    })

    await enqueueAttendance(baseInput)
    await enqueueAttendance({ ...baseInput, student: 11 })
    await enqueueAttendance({ ...baseInput, student: 12 })

    await trySyncAll(1)

    expect(callOrder).toEqual([10, 11, 12])
    expect(post).toHaveBeenCalledTimes(3)
  })

  it("only syncs items belonging to the given teacher", async () => {
    post.mockResolvedValue({ data: { id: 1 } })
    await enqueueAttendance(baseInput)
    await enqueueAttendance({ ...baseInput, teacherId: 2 })

    await trySyncAll(1)

    expect(post).toHaveBeenCalledTimes(1)
  })

  it("retryItem resets a failed item to pending and re-attempts sync", async () => {
    post.mockRejectedValueOnce({ response: { status: 500, data: {} } })
    const id = await enqueueAttendance(baseInput)
    await trySyncAll(1)
    expect((await offlineDB.attendanceQueue.get(id))?.syncStatus).toBe("failed")

    post.mockResolvedValueOnce({ data: { id: 42 } })
    await retryItem(1, id)

    const item = await offlineDB.attendanceQueue.get(id)
    expect(item?.syncStatus).toBe("synced")
  })

  it("discardItem removes the item from the queue", async () => {
    const id = await enqueueAttendance(baseInput)

    await discardItem(id)

    expect(await offlineDB.attendanceQueue.get(id)).toBeUndefined()
  })
})
