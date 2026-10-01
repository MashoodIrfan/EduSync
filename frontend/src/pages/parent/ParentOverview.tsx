import { CalendarCheck, GraduationCap, Receipt, School } from "lucide-react"
import { Link } from "react-router-dom"

import { useAuth } from "../../auth/AuthContext"
import { useParentAttendance, useParentFees, useParentProfile } from "../../api/parent"
import { Card, LoadError, Spinner } from "../../components/ui"
import { DashboardHeader, RadialProgress, StatCard, TrendChart } from "../../components/widgets"

const STATUS_VALUE: Record<string, number> = { PRESENT: 100, LATE: 55, ABSENT: 0 }

export function ParentOverview() {
  const { user } = useAuth()
  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useParentProfile()
  const {
    data: attendance,
    isLoading: attendanceLoading,
    isError: attendanceError,
    refetch: refetchAttendance,
  } = useParentAttendance()
  const {
    data: fees,
    isLoading: feesLoading,
    isError: feesError,
    refetch: refetchFees,
  } = useParentFees()

  if (profileLoading || attendanceLoading || feesLoading) return <Spinner />
  if (profileError || attendanceError || feesError) {
    return (
      <LoadError
        onRetry={() => {
          if (profileError) refetchProfile()
          if (attendanceError) refetchAttendance()
          if (feesError) refetchFees()
        }}
      />
    )
  }
  if (!profile) return null

  const presentCount = attendance?.filter((a) => a.status === "PRESENT").length ?? 0
  const attendanceRate = attendance?.length ? Math.round((presentCount / attendance.length) * 100) : 0

  const trendPoints = [...(attendance ?? [])]
    .slice(0, 7)
    .reverse()
    .map((record) => ({
      label: new Date(record.date).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      value: STATUS_VALUE[record.status] ?? 0,
    }))

  const unpaidInvoices = fees?.filter((invoice) => invoice.status === "UNPAID") ?? []
  const nextInvoice = unpaidInvoices[0]

  return (
    <div>
      <DashboardHeader
        greeting={`Welcome back, ${user?.firstName || user?.username}`}
        subtitle={`Here's how ${profile.student_name.split(" ")[0]} is doing at school.`}
        schoolName={user?.tenantName}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard icon={GraduationCap} label="Student" value={profile.student_name} tone="brand" />
            <StatCard icon={School} label="Class" value={profile.class_name} tone="blue" />
            <StatCard icon={Receipt} label="Unpaid Invoices" value={unpaidInvoices.length} tone="amber" />
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">Attendance Trend</p>
                <p className="text-xs text-gray-400">Most recent {trendPoints.length} records</p>
              </div>
              <CalendarCheck size={18} className="text-gray-300" />
            </div>
            <TrendChart points={trendPoints} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="flex flex-col items-center">
            <p className="mb-3 self-start text-sm font-semibold text-gray-900">Attendance Rate</p>
            <RadialProgress value={attendanceRate} label={`${presentCount} of ${attendance?.length ?? 0} days present`} />
          </Card>

          <div className="rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 p-5 text-white shadow-sm shadow-brand-200">
            <p className="mb-3 text-sm font-semibold">Next Payment Due</p>
            {nextInvoice ? (
              <>
                <p className="text-2xl font-semibold">Rs. {nextInvoice.amount}</p>
                <p className="mb-4 text-sm text-brand-100">{nextInvoice.description}</p>
                <div className="flex items-center justify-between text-xs text-brand-100">
                  <span>Due {nextInvoice.due_date}</span>
                  <Link
                    to="/parent/fees"
                    className="rounded-full bg-white/15 px-3 py-1.5 font-medium text-white hover:bg-white/25"
                  >
                    Pay Now
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-brand-100">No pending fees right now.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
