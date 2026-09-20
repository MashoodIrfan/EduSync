import {
  BookOpen,
  ClipboardList,
  CreditCard,
  Layers,
  Receipt,
  Settings,
  UserCog,
  UserRound,
  Users,
} from "lucide-react"

import { PortalLayout } from "../../components/PortalLayout"

const NAV_ITEMS = [
  { to: "/school-admin", label: "Classes", end: true, icon: Layers },
  { to: "/school-admin/subjects", label: "Subjects", icon: BookOpen },
  { to: "/school-admin/students", label: "Students", icon: Users },
  { to: "/school-admin/teachers", label: "Teachers", icon: UserCog },
  { to: "/school-admin/teacher-assignments", label: "Assignments", icon: ClipboardList },
  { to: "/school-admin/parents", label: "Parents", icon: UserRound },
  { to: "/school-admin/fee-invoices", label: "Fee Invoices", icon: Receipt },
  { to: "/school-admin/payments", label: "Payments", icon: CreditCard },
  { to: "/school-admin/school", label: "School Setup", icon: Settings },
]

export function SchoolAdminLayout() {
  return <PortalLayout title="School Admin Portal" navItems={NAV_ITEMS} />
}
