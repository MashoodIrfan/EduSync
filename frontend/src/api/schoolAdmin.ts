import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  SchoolAdminClassInfo,
  SchoolAdminFeeInvoiceInfo,
  SchoolAdminParentInfo,
  SchoolAdminPaymentInfo,
  SchoolAdminStudentInfo,
  SchoolAdminSubjectInfo,
  SchoolAdminTeacherAssignmentInfo,
  SchoolAdminTeacherInfo,
  SchoolInfo,
} from "../types"
import { apiClient } from "./client"

function useList<T>(key: string, url: string, params?: Record<string, unknown>) {
  return useQuery({
    queryKey: [key, "list", params],
    queryFn: async () => (await apiClient.get<T[]>(url, { params })).data,
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, key: string) {
  queryClient.invalidateQueries({ queryKey: [key, "list"] })
}

// ---- Classes ----

export function useClasses() {
  return useList<SchoolAdminClassInfo>("classes", "/school-admin/classes/")
}

export function useCreateClass() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; section: string }) =>
      (await apiClient.post("/school-admin/classes/", payload)).data,
    onSuccess: () => invalidate(queryClient, "classes"),
  })
}

// ---- Subjects ----

export function useSubjects() {
  return useList<SchoolAdminSubjectInfo>("subjects", "/school-admin/subjects/")
}

export function useCreateSubject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; code: string }) =>
      (await apiClient.post("/school-admin/subjects/", payload)).data,
    onSuccess: () => invalidate(queryClient, "subjects"),
  })
}

// ---- Students ----

export function useStudents(classRoomId?: number) {
  return useList<SchoolAdminStudentInfo>("students", "/school-admin/students/", {
    class_room: classRoomId,
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      student_id: string
      first_name: string
      last_name: string
      date_of_birth: string
      class_room: number
    }) => (await apiClient.post("/school-admin/students/", payload)).data,
    onSuccess: () => invalidate(queryClient, "students"),
  })
}

// ---- Teachers ----

export function useTeachers() {
  return useList<SchoolAdminTeacherInfo>("teachers", "/school-admin/teachers/")
}

export function useCreateTeacher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      username: string
      first_name: string
      last_name: string
      email: string
      password: string
    }) => (await apiClient.post("/school-admin/teachers/", payload)).data,
    onSuccess: () => invalidate(queryClient, "teachers"),
  })
}

export function useToggleTeacherActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await apiClient.patch(`/school-admin/teachers/${id}/`, { is_active: isActive })).data,
    onSuccess: () => invalidate(queryClient, "teachers"),
  })
}

// ---- Teacher Assignments ----

export function useTeacherAssignments() {
  return useList<SchoolAdminTeacherAssignmentInfo>(
    "teacher-assignments",
    "/school-admin/teacher-assignments/",
  )
}

export function useCreateTeacherAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { teacher: number; class_room: number; subject: number }) =>
      (await apiClient.post("/school-admin/teacher-assignments/", payload)).data,
    onSuccess: () => invalidate(queryClient, "teacher-assignments"),
  })
}

export function useDeleteTeacherAssignment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.delete(`/school-admin/teacher-assignments/${id}/`)).data,
    onSuccess: () => invalidate(queryClient, "teacher-assignments"),
  })
}

// ---- Parents ----

export function useParents() {
  return useList<SchoolAdminParentInfo>("parents", "/school-admin/parents/")
}

export function useCreateParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      username: string
      first_name: string
      last_name: string
      student: number
    }) => (await apiClient.post("/school-admin/parents/", payload)).data,
    onSuccess: () => invalidate(queryClient, "parents"),
  })
}

export function useResetParentPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.post(`/school-admin/parents/${id}/reset-password/`)).data,
    onSuccess: () => invalidate(queryClient, "parents"),
  })
}

export function useDeleteParent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => (await apiClient.delete(`/school-admin/parents/${id}/`)).data,
    onSuccess: () => invalidate(queryClient, "parents"),
  })
}

// ---- Fee Invoices ----

export function useFeeInvoices(filters: { student?: number; status?: string } = {}) {
  return useList<SchoolAdminFeeInvoiceInfo>("fee-invoices", "/school-admin/fee-invoices/", filters)
}

export function useCreateFeeInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      student: number
      description: string
      amount: string
      due_date: string
    }) => (await apiClient.post("/school-admin/fee-invoices/", payload)).data,
    onSuccess: () => invalidate(queryClient, "fee-invoices"),
  })
}

export function useCancelFeeInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) =>
      (await apiClient.patch(`/school-admin/fee-invoices/${id}/`, { status: "CANCELLED" })).data,
    onSuccess: () => invalidate(queryClient, "fee-invoices"),
  })
}

// ---- Payments (read-only) ----

export function usePayments() {
  return useList<SchoolAdminPaymentInfo>("payments", "/school-admin/payments/")
}

// ---- School setup ----

export function useSchool() {
  return useQuery({
    queryKey: ["school"],
    queryFn: async () => (await apiClient.get<SchoolInfo>("/school-admin/school/")).data,
  })
}

export function useUpdateSchool() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Pick<SchoolInfo, "name" | "email" | "phone" | "address">>) =>
      (await apiClient.patch("/school-admin/school/", payload)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school"] }),
  })
}
