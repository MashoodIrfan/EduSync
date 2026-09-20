import { Navigate, useLocation } from "react-router-dom"

import { useParentProfile } from "../../api/parent"
import { PortalLayout } from "../../components/PortalLayout"
import { Spinner } from "../../components/ui"

const FULL_NAV = [
  { to: "/parent", label: "Overview", end: true },
  { to: "/parent/attendance", label: "Attendance" },
  { to: "/parent/remarks", label: "Remarks" },
  { to: "/parent/fees", label: "Fees" },
  { to: "/parent/payments", label: "Payments" },
  { to: "/parent/change-password", label: "Change Password" },
]

const RESTRICTED_NAV = [{ to: "/parent/change-password", label: "Change Password" }]

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
          <div className="mx-auto max-w-6xl px-4 pt-4">
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              Please set a new password before using the parent portal.
            </div>
          </div>
        ) : undefined
      }
    />
  )
}
