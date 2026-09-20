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

export interface TeacherAssignmentInfo {
  id: number
  class_id: number
  class_name: string
  subject_id: number
  subject_name: string
  subject_code: string
  created_at: string
}

export interface TeacherStudentInfo {
  id: number
  student_id: string
  student_name: string
  class_name: string
  date_of_birth: string | null
}

export interface TeacherAttendanceInfo {
  id: number
  student_id: string
  student_name: string
  class_name: string
  subject_id: number
  subject_name: string
  teacher_name: string
  date: string
  status: "PRESENT" | "ABSENT" | "LATE"
  created_at: string
  updated_at: string
}

export interface SchoolAdminClassInfo {
  id: number
  name: string
  section: string
  created_at: string
  updated_at: string
}

export interface SchoolAdminSubjectInfo {
  id: number
  name: string
  code: string
  created_at: string
  updated_at: string
}

export interface SchoolAdminStudentInfo {
  id: number
  student_id: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  class_room: number
  class_name: string
  created_at: string
  updated_at: string
}

export interface SchoolAdminTeacherInfo {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  date_joined: string
}

export interface SchoolAdminTeacherAssignmentInfo {
  id: number
  teacher: number
  teacher_name: string
  class_room: number
  class_name: string
  subject: number
  subject_name: string
  created_at: string
}

export interface SchoolAdminParentInfo {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  student_id: string
  student_name: string
  must_change_password: boolean
  created_at: string
}

export interface SchoolAdminFeeInvoiceInfo {
  id: number
  invoice_number: string
  student: number
  student_name: string
  description: string
  amount: string
  due_date: string
  status: "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED"
  created_at: string
  updated_at: string
}

export interface SchoolAdminPaymentInfo {
  id: number
  transaction_id: string
  invoice_number: string
  student_name: string
  parent_username: string
  gateway: string
  amount: string
  status: string
  gateway_reference: string
  created_at: string
  updated_at: string
}

export interface SchoolInfo {
  id: number
  name: string
  slug: string
  email: string
  phone: string
  address: string
  created_at: string
  updated_at: string
}

export interface PlatformAdminTenantInfo {
  id: number
  name: string
  slug: string
  email: string
  phone: string
  address: string
  created_at: string
  updated_at: string
}

export interface PlatformAdminSchoolAdminInfo {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  is_active: boolean
  date_joined: string
  temporary_password: string | null
}

export interface ApiError {
  response?: {
    data?: Record<string, unknown> | { detail?: string }
    status?: number
  }
}
