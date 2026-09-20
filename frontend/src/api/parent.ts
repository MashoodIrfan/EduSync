import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import type {
  AttendanceRecordInfo,
  AttendanceRemarkInfo,
  FeeInvoiceInfo,
  ParentProfileInfo,
  PaymentTransactionInfo,
} from "../types"
import { apiClient } from "./client"

export function useParentProfile() {
  return useQuery({
    queryKey: ["parent", "me"],
    queryFn: async () => {
      const response = await apiClient.get<ParentProfileInfo>("/parent/me/")
      return response.data
    },
  })
}

export function useParentAttendance() {
  return useQuery({
    queryKey: ["parent", "attendance"],
    queryFn: async () => {
      const response = await apiClient.get<AttendanceRecordInfo[]>("/parent/attendance/")
      return response.data
    },
  })
}

export function useParentRemarks() {
  return useQuery({
    queryKey: ["parent", "remarks"],
    queryFn: async () => {
      const response = await apiClient.get<AttendanceRemarkInfo[]>("/parent/remarks/")
      return response.data
    },
  })
}

export function useParentFees() {
  return useQuery({
    queryKey: ["parent", "fees"],
    queryFn: async () => {
      const response = await apiClient.get<FeeInvoiceInfo[]>("/parent/fees/")
      return response.data
    },
  })
}

export function useParentPayments() {
  return useQuery({
    queryKey: ["parent", "payments"],
    queryFn: async () => {
      const response = await apiClient.get<PaymentTransactionInfo[]>("/parent/payments/")
      return response.data
    },
  })
}

export function useInitiatePayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const response = await apiClient.post("/parent/payments/initiate/", {
        invoice_id: invoiceId,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent", "payments"] })
    },
  })
}

interface ChangePasswordPayload {
  old_password: string
  new_password: string
  confirm_password: string
}

export function useParentChangePassword() {
  return useMutation({
    mutationFn: async (payload: ChangePasswordPayload) => {
      const response = await apiClient.post("/parent/change-password/", payload)
      return response.data
    },
  })
}
