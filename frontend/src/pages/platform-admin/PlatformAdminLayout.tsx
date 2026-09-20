import { School } from "lucide-react"

import { PortalLayout } from "../../components/PortalLayout"

const NAV_ITEMS = [{ to: "/platform-admin", label: "Schools", end: true, icon: School }]

export function PlatformAdminLayout() {
  return <PortalLayout title="Platform Admin" navItems={NAV_ITEMS} />
}
