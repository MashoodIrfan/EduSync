import { PortalLayout } from "../../components/PortalLayout"

const NAV_ITEMS = [
  { to: "/teacher", label: "My Classes", end: true },
  { to: "/teacher/attendance", label: "Attendance History" },
]

export function TeacherLayout() {
  return <PortalLayout title="Teacher Portal" navItems={NAV_ITEMS} />
}
