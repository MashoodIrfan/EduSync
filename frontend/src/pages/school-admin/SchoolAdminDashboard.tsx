import { Layers, Receipt, UserCog, Users, UserRound } from "lucide-react"
import { Link } from "react-router-dom"

import { useAuth } from "../../auth/AuthContext"
import {
  useClasses,
  useFeeInvoices,
  useParents,
  useSchool,
  useStudents,
  useTeachers,
} from "../../api/schoolAdmin"
import { Card, LoadError, Spinner } from "../../components/ui"
import { DashboardHeader, RadialProgress, StatCard } from "../../components/widgets"

export function SchoolAdminDashboard() {
  const { user } = useAuth()
  const { data: school, isLoading: schoolLoading, isError: schoolError, refetch: refetchSchool } = useSchool()
  const { data: classes, isLoading: classesLoading, isError: classesError, refetch: refetchClasses } = useClasses()
  const {
    data: students,
    isLoading: studentsLoading,
    isError: studentsError,
    refetch: refetchStudents,
  } = useStudents()
  const {
    data: teachers,
    isLoading: teachersLoading,
    isError: teachersError,
    refetch: refetchTeachers,
  } = useTeachers()
  const {
    data: invoices,
    isLoading: invoicesLoading,
    isError: invoicesError,
    refetch: refetchInvoices,
  } = useFeeInvoices()
  const { data: parents, isLoading: parentsLoading, isError: parentsError, refetch: refetchParents } = useParents()

  if (
    schoolLoading ||
    classesLoading ||
    studentsLoading ||
    teachersLoading ||
    invoicesLoading ||
    parentsLoading
  ) {
    return <Spinner />
  }

  if (schoolError || classesError || studentsError || teachersError || invoicesError || parentsError) {
    return (
      <LoadError
        onRetry={() => {
          if (schoolError) refetchSchool()
          if (classesError) refetchClasses()
          if (studentsError) refetchStudents()
          if (teachersError) refetchTeachers()
          if (invoicesError) refetchInvoices()
          if (parentsError) refetchParents()
        }}
      />
    )
  }

  const paidCount = invoices?.filter((invoice) => invoice.status === "PAID").length ?? 0
  const collectionRate = invoices?.length ? Math.round((paidCount / invoices.length) * 100) : 0
  const unpaidCount = invoices?.filter((invoice) => invoice.status === "UNPAID").length ?? 0
  const recentParents = [...(parents ?? [])].slice(0, 5)

  return (
    <div>
      <DashboardHeader
        greeting={`Welcome back, ${user?.firstName || user?.username}`}
        subtitle={`Here's what's happening at ${school?.name ?? "your school"}.`}
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Layers} label="Classes" value={classes?.length ?? 0} tone="brand" />
        <StatCard icon={Users} label="Students" value={students?.length ?? 0} tone="blue" />
        <StatCard icon={UserCog} label="Teachers" value={teachers?.length ?? 0} tone="emerald" />
        <StatCard icon={Receipt} label="Unpaid Invoices" value={unpaidCount} tone="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center lg:col-span-1">
          <p className="mb-3 self-start text-sm font-semibold text-gray-900">Fee Collection Rate</p>
          <RadialProgress value={collectionRate} color="#059669" trackColor="#ecfdf5" label={`${paidCount} of ${invoices?.length ?? 0} invoices paid`} />
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Recent Parent Accounts</p>
            <Link to="/school-admin/parents" className="text-xs font-medium text-brand-600 hover:text-brand-800">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentParents.map((parent) => (
              <div key={parent.id} className="flex items-center gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
                  <UserRound size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-gray-900">
                    {parent.first_name} {parent.last_name} ({parent.username})
                  </p>
                  <p className="text-xs text-gray-400">
                    {parent.student_name} · {parent.student_id}
                  </p>
                </div>
              </div>
            ))}
            {recentParents.length === 0 && <p className="text-sm text-gray-400">No parent accounts yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}
