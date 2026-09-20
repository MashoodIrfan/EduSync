import { useParentProfile } from "../../api/parent"
import { Card, PageTitle, Spinner } from "../../components/ui"

export function ParentOverview() {
  const { data: profile, isLoading } = useParentProfile()

  if (isLoading) return <Spinner />
  if (!profile) return null

  return (
    <div>
      <PageTitle>Overview</PageTitle>
      <Card>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-gray-500">Student</dt>
            <dd className="text-sm text-gray-900">{profile.student_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Student ID</dt>
            <dd className="text-sm text-gray-900">{profile.student_id}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-gray-500">Class</dt>
            <dd className="text-sm text-gray-900">{profile.class_name}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
