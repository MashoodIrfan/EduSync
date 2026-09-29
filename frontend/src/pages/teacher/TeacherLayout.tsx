import { ClipboardList, GraduationCap, RefreshCw, Wifi, WifiOff } from "lucide-react"

import { useAuth } from "../../auth/AuthContext"
import { PortalLayout } from "../../components/PortalLayout"
import { useAutoSync, useOnlineStatus, useSyncQueue } from "../../offline/hooks"

export function TeacherLayout() {
  const { user } = useAuth()
  const teacherId = user?.id
  const isOnline = useOnlineStatus()
  const queue = useSyncQueue(teacherId)

  useAutoSync(teacherId)

  const pendingCount = queue?.filter((item) => item.syncStatus === "pending" || item.syncStatus === "syncing").length ?? 0
  const issueCount = queue?.filter((item) => item.syncStatus === "failed" || item.syncStatus === "conflict").length ?? 0

  const navItems = [
    { to: "/teacher", label: "My Classes", end: true, icon: GraduationCap },
    { to: "/teacher/attendance", label: "Attendance History", icon: ClipboardList },
    { to: "/teacher/sync", label: "Sync Status", icon: RefreshCw, badge: pendingCount + issueCount },
  ]

  return (
    <PortalLayout
      title="Teacher Portal"
      navItems={navItems}
      statusBadge={
        <div
          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${
            isOnline ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? "Online" : "Offline"}
          {pendingCount > 0 && <span className="ml-auto">{pendingCount} pending</span>}
        </div>
      }
    />
  )
}
