import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom"

import { AuthProvider, useAuth } from "./auth/AuthContext"
import { ProtectedRoute } from "./auth/ProtectedRoute"
import { LoginPage } from "./pages/LoginPage"
import { ParentAttendance } from "./pages/parent/ParentAttendance"
import { ParentChangePassword } from "./pages/parent/ParentChangePassword"
import { ParentFees } from "./pages/parent/ParentFees"
import { ParentLayout } from "./pages/parent/ParentLayout"
import { ParentOverview } from "./pages/parent/ParentOverview"
import { ParentPayments } from "./pages/parent/ParentPayments"
import { ParentRemarks } from "./pages/parent/ParentRemarks"
import { SchoolAdminClasses } from "./pages/school-admin/SchoolAdminClasses"
import { SchoolAdminFeeInvoices } from "./pages/school-admin/SchoolAdminFeeInvoices"
import { SchoolAdminLayout } from "./pages/school-admin/SchoolAdminLayout"
import { SchoolAdminParents } from "./pages/school-admin/SchoolAdminParents"
import { SchoolAdminPayments } from "./pages/school-admin/SchoolAdminPayments"
import { SchoolAdminSchoolSetup } from "./pages/school-admin/SchoolAdminSchoolSetup"
import { SchoolAdminStudents } from "./pages/school-admin/SchoolAdminStudents"
import { SchoolAdminSubjects } from "./pages/school-admin/SchoolAdminSubjects"
import { SchoolAdminTeacherAssignments } from "./pages/school-admin/SchoolAdminTeacherAssignments"
import { SchoolAdminTeachers } from "./pages/school-admin/SchoolAdminTeachers"
import { TeacherAssignments } from "./pages/teacher/TeacherAssignments"
import { TeacherAttendanceHistory } from "./pages/teacher/TeacherAttendanceHistory"
import { TeacherLayout } from "./pages/teacher/TeacherLayout"
import { TeacherMarkAttendance } from "./pages/teacher/TeacherMarkAttendance"

const queryClient = new QueryClient()

const ROLE_HOME: Record<string, string> = {
  PARENT: "/parent",
  TEACHER: "/teacher",
  SCHOOL_ADMIN: "/school-admin",
  PLATFORM_ADMIN: "/platform-admin",
}

function HomeRedirect() {
  const { user } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  return <Navigate to={ROLE_HOME[user.role] ?? "/login"} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute allowedRoles={["PARENT"]} />}>
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ParentOverview />} />
          <Route path="attendance" element={<ParentAttendance />} />
          <Route path="remarks" element={<ParentRemarks />} />
          <Route path="fees" element={<ParentFees />} />
          <Route path="payments" element={<ParentPayments />} />
          <Route path="change-password" element={<ParentChangePassword />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["TEACHER"]} />}>
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherAssignments />} />
          <Route path="attendance" element={<TeacherAttendanceHistory />} />
        </Route>
        <Route path="/teacher/mark-attendance/:classId/:subjectId" element={<TeacherLayout />}>
          <Route index element={<TeacherMarkAttendance />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["SCHOOL_ADMIN"]} />}>
        <Route path="/school-admin" element={<SchoolAdminLayout />}>
          <Route index element={<SchoolAdminClasses />} />
          <Route path="subjects" element={<SchoolAdminSubjects />} />
          <Route path="students" element={<SchoolAdminStudents />} />
          <Route path="teachers" element={<SchoolAdminTeachers />} />
          <Route path="teacher-assignments" element={<SchoolAdminTeacherAssignments />} />
          <Route path="parents" element={<SchoolAdminParents />} />
          <Route path="fee-invoices" element={<SchoolAdminFeeInvoices />} />
          <Route path="payments" element={<SchoolAdminPayments />} />
          <Route path="school" element={<SchoolAdminSchoolSetup />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}
