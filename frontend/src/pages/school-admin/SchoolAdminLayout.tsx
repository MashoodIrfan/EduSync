import { PortalLayout } from "../../components/PortalLayout"

const NAV_ITEMS = [
  { to: "/school-admin", label: "Classes", end: true },
  { to: "/school-admin/subjects", label: "Subjects" },
  { to: "/school-admin/students", label: "Students" },
  { to: "/school-admin/teachers", label: "Teachers" },
  { to: "/school-admin/teacher-assignments", label: "Assignments" },
  { to: "/school-admin/parents", label: "Parents" },
  { to: "/school-admin/fee-invoices", label: "Fee Invoices" },
  { to: "/school-admin/payments", label: "Payments" },
  { to: "/school-admin/school", label: "School Setup" },
]

export function SchoolAdminLayout() {
  return <PortalLayout title="School Admin Portal" navItems={NAV_ITEMS} />
}
