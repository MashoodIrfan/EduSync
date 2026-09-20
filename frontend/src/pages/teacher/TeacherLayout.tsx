import { ClipboardList, GraduationCap } from "lucide-react"

import { PortalLayout } from "../../components/PortalLayout"

const NAV_ITEMS = [
  { to: "/teacher", label: "My Classes", end: true, icon: GraduationCap },
  { to: "/teacher/attendance", label: "Attendance History", icon: ClipboardList },
]

export function TeacherLayout() {
  return <PortalLayout title="Teacher Portal" navItems={NAV_ITEMS} />
}
