import { AlertTriangle, CheckCircle2, Clock, RefreshCw, Trash2, Wifi, WifiOff } from "lucide-react"
import type { ReactNode } from "react"

import { useAuth } from "../../auth/AuthContext"
import { Button, Card, EmptyState, PageTitle } from "../../components/ui"
import { offlineDB } from "../../offline/db"
import { useOnlineStatus, useSyncQueue } from "../../offline/hooks"
import { discardItem, retryItem, trySyncAll } from "../../offline/syncEngine"

const STATUS_META: Record<string, { label: string; tone: "amber" | "blue" | "emerald" | "red" }> = {
  pending: { label: "Queued", tone: "amber" },
  syncing: { label: "Syncing", tone: "blue" },
  synced: { label: "Synced", tone: "emerald" },
  failed: { label: "Failed", tone: "red" },
  conflict: { label: "Conflict", tone: "red" },
}

function StatusPill({ tone, children }: { tone: "amber" | "blue" | "emerald" | "red"; children: ReactNode }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
  }

  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[tone]}`}>{children}</span>
}

export function TeacherSyncStatus() {
  const { user } = useAuth()
  const teacherId = user?.id
  const isOnline = useOnlineStatus()
  const queue = useSyncQueue(teacherId)

  const pendingCount = queue?.filter((item) => item.syncStatus === "pending" || item.syncStatus === "syncing").length ?? 0
  const issueCount = queue?.filter((item) => item.syncStatus === "failed" || item.syncStatus === "conflict").length ?? 0
  const syncedCount = queue?.filter((item) => item.syncStatus === "synced").length ?? 0

  async function handleClearSynced() {
    const synced = queue?.filter((item) => item.syncStatus === "synced") ?? []
    await offlineDB.attendanceQueue.bulkDelete(synced.map((item) => item.id!))
  }

  return (
    <div>
      <PageTitle
        subtitle="Attendance saved while offline is queued here and synced automatically once you're back online."
      >
        Sync Status
      </PageTitle>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="flex items-center gap-3">
          {isOnline ? <Wifi size={20} className="text-emerald-600" /> : <WifiOff size={20} className="text-red-600" />}
          <div>
            <p className="text-xs text-gray-400">Connection</p>
            <p className="text-sm font-semibold text-gray-900">{isOnline ? "Online" : "Offline"}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <Clock size={20} className="text-amber-500" />
          <div>
            <p className="text-xs text-gray-400">Pending</p>
            <p className="text-sm font-semibold text-gray-900">{pendingCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-500" />
          <div>
            <p className="text-xs text-gray-400">Needs Attention</p>
            <p className="text-sm font-semibold text-gray-900">{issueCount}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <CheckCircle2 size={20} className="text-emerald-500" />
          <div>
            <p className="text-xs text-gray-400">Synced</p>
            <p className="text-sm font-semibold text-gray-900">{syncedCount}</p>
          </div>
        </Card>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Queue</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleClearSynced} disabled={syncedCount === 0}>
            <Trash2 size={14} />
            Clear Synced
          </Button>
          <Button onClick={() => teacherId && trySyncAll(teacherId)} disabled={!isOnline || pendingCount === 0}>
            <RefreshCw size={14} />
            Sync Now
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Class / Subject</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Queued At</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {queue?.map((item) => {
              const meta = STATUS_META[item.syncStatus]

              return (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">{item.studentLabel}</td>
                  <td className="px-4 py-2">
                    {item.classLabel} · {item.subjectLabel}
                  </td>
                  <td className="px-4 py-2">{item.date}</td>
                  <td className="px-4 py-2">
                    <div>
                      <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                      {item.syncError && <p className="mt-1 text-xs text-red-500">{item.syncError}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-400">{new Date(item.queuedAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {(item.syncStatus === "failed" || item.syncStatus === "conflict") && (
                      <>
                        {item.syncStatus === "failed" && (
                          <button
                            onClick={() => teacherId && retryItem(teacherId, item.id!)}
                            className="text-xs font-medium text-brand-600 hover:text-brand-800"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() => discardItem(item.id!)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Discard
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {(!queue || queue.length === 0) && (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState>No attendance has been queued yet.</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
