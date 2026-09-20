export type Role = "PLATFORM_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "PARENT"

export interface DecodedToken {
  user_id: number
  role: Role
  tenant_id: number | null
  username: string
  first_name: string
  last_name: string
  exp: number
}

export interface AuthUser {
  id: number
  role: Role
  tenantId: number | null
  username: string
  firstName: string
  lastName: string
}

export interface ParentProfileInfo {
  student_id: string
  student_name: string
  class_name: string
  must_change_password: boolean
}

export interface AttendanceRecordInfo {
  id: number
  subject_name: string
  teacher_name: string
  date: string
  status: "PRESENT" | "ABSENT" | "LATE"
}

export interface AttendanceRemarkInfo {
  id: number
  subject_name: string
  teacher_name: string
  date: string
  remark: string
  created_at: string
}

export interface FeeInvoiceInfo {
  id: number
  invoice_number: string
  student_name: string
  description: string
  amount: string
  due_date: string
  status: "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED"
  remaining_amount?: string
  created_at: string
}

export interface PaymentTransactionInfo {
  id: number
  transaction_id: string
  invoice_number: string
  gateway: string
  amount: string
  status: string
  gateway_reference: string
  created_at: string
  updated_at: string
}

export interface ApiError {
  response?: {
    data?: Record<string, unknown> | { detail?: string }
    status?: number
  }
}
