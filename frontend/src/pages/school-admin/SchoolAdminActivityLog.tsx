import { Activity } from "lucide-react"

import { useAuditLog } from "../../api/schoolAdmin"
import { Card, EmptyState, LoadError, PageTitle, Spinner } from "../../components/ui"

function formatAction(action: string) {
  return action
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ")
}

export function SchoolAdminActivityLog() {
  const { data, isLoading, isError, refetch } = useAuditLog()

  if (isLoading) return <Spinner />
  if (isError) return <LoadError onRetry={() => refetch()} />

  return (
    <div>
      <PageTitle subtitle="Privileged actions — account changes, fee invoices, payments. The most recent 200 entries.">
        Activity Log
      </PageTitle>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Who</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Target</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((entry) => (
              <tr key={entry.id} className="border-b border-gray-100">
                <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-400">
                  {new Date(entry.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">{entry.actor_label || "system"}</td>
                <td className="px-4 py-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    <Activity size={12} />
                    {formatAction(entry.action)}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-600">{entry.object_repr}</td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={4} className="p-0">
                  <EmptyState>No activity recorded yet.</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
