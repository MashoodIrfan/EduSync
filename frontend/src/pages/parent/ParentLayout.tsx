import { CalendarCheck, CreditCard, KeyRound, LayoutDashboard, MessageSquare, Receipt } from "lucide-react"
import { Navigate, useLocation } from "react-router-dom"

import { useParentProfile } from "../../api/parent"
import { PortalLayout } from "../../components/PortalLayout"
import { Spinner } from "../../components/ui"

const FULL_NAV = [
  { to: "/parent", label: "Overview", end: true, icon: LayoutDashboard },
  { to: "/parent/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/parent/remarks", label: "Remarks", icon: MessageSquare },
  { to: "/parent/fees", label: "Fees", icon: Receipt },
  { to: "/parent/payments", label: "Payments", icon: CreditCard },
  { to: "/parent/change-password", label: "Change Password", icon: KeyRound },
]

const RESTRICTED_NAV = [{ to: "/parent/change-password", label: "Change Password", icon: KeyRound }]

export function ParentLayout() {
  const { data: profile, isLoading } = useParentProfile()
  const location = useLocation()

  if (isLoading) {
    return <Spinner />
  }

  const mustChangePassword = profile?.must_change_password ?? false

  if (mustChangePassword && location.pathname !== "/parent/change-password") {
    return <Navigate to="/parent/change-password" replace />
  }

  return (
    <PortalLayout
      title="Parent Portal"
      navItems={mustChangePassword ? RESTRICTED_NAV : FULL_NAV}
      banner={
        mustChangePassword ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 sm:px-6 lg:px-8">
            Please set a new password before using the parent portal.
          </div>
        ) : undefined
      }
    />
  )
}
