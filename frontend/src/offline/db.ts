import Dexie, { type Table } from "dexie"

import type { TeacherAssignmentInfo, TeacherStudentInfo } from "../types"

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE"
export type SyncStatus = "pending" | "syncing" | "synced" | "failed" | "conflict"

export interface QueuedAttendance {
  id?: number
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
  queuedAt: string
  syncStatus: SyncStatus
  syncError?: string
  serverId?: number
}

export interface CachedRoster {
  key: string
  teacherId: number
  classId: number
  subjectId: number
  className: string
  subjectName: string
  students: TeacherStudentInfo[]
  cachedAt: string
}

export interface CachedAssignments {
  teacherId: number
  assignments: TeacherAssignmentInfo[]
  cachedAt: string
}

class EduSyncOfflineDB extends Dexie {
  attendanceQueue!: Table<QueuedAttendance, number>
  rosterCache!: Table<CachedRoster, string>
  assignmentsCache!: Table<CachedAssignments, number>

  constructor() {
    super("edusync-offline")

    this.version(1).stores({
      attendanceQueue: "++id, teacherId, syncStatus, [teacherId+syncStatus]",
      rosterCache: "key, teacherId",
      assignmentsCache: "teacherId",
    })
  }
}

export const offlineDB = new EduSyncOfflineDB()

export function rosterCacheKey(teacherId: number, classId: number, subjectId: number) {
  return `${teacherId}_${classId}_${subjectId}`
}
