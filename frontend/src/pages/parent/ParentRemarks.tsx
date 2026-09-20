import { useParentRemarks } from "../../api/parent"
import { Card, PageTitle, Spinner } from "../../components/ui"

export function ParentRemarks() {
  const { data, isLoading } = useParentRemarks()

  if (isLoading) return <Spinner />

  return (
    <div>
      <PageTitle>Remarks</PageTitle>
      <div className="space-y-3">
        {data?.map((remark) => (
          <Card key={remark.id}>
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>
                {remark.subject_name} · {remark.date}
              </span>
              <span>{remark.teacher_name}</span>
            </div>
            <p className="text-sm text-gray-900">{remark.remark}</p>
          </Card>
        ))}
        {data?.length === 0 && <Card className="text-center text-gray-500">No remarks yet.</Card>}
      </div>
    </div>
  )
}
