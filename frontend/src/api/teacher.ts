import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  AttendanceStatusChangeInfo,
  TeacherAssignmentInfo,
  TeacherAttendanceInfo,
  TeacherStudentInfo,
} from "../types"
import { apiClient } from "./client"

export function useTeacherAssignments() {
  return useQuery({
    queryKey: ["teacher", "assignments"],
    queryFn: async () => {
      const response = await apiClient.get<TeacherAssignmentInfo[]>("/teacher/assignments/")
      return response.data
    },
  })
}

export function useTeacherClassStudents(classId: number | null) {
  return useQuery({
    queryKey: ["teacher", "class-students", classId],
    queryFn: async () => {
      const response = await apiClient.get<TeacherStudentInfo[]>(
        `/teacher/classes/${classId}/students/`,
      )
      return response.data
    },
    enabled: classId !== null,
  })
}

interface AttendanceFilters {
  class_room?: number
  subject?: number
  date?: string
}

export function useTeacherAttendance(filters: AttendanceFilters = {}) {
  return useQuery({
    queryKey: ["teacher", "attendance", filters],
    queryFn: async () => {
      const response = await apiClient.get<TeacherAttendanceInfo[]>("/teacher/attendance/", {
        params: filters,
      })
      return response.data
    },
  })
}

interface MarkAttendancePayload {
  student: number
  class_room: number
  subject: number
  date: string
  status: "PRESENT" | "ABSENT" | "LATE"
  remark?: string
}

export function useMarkAttendance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: MarkAttendancePayload) => {
      const response = await apiClient.post("/teacher/attendance/", payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher", "attendance"] })
    },
  })
}

export function useAttendanceStatusChanges() {
  return useQuery({
    queryKey: ["teacher", "attendance", "status-changes"],
    queryFn: async () => {
      const response = await apiClient.get<AttendanceStatusChangeInfo[]>(
        "/teacher/attendance/status-changes/",
      )
      return response.data
    },
  })
}
