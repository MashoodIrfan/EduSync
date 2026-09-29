import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useState } from "react"

import { offlineDB, rosterCacheKey, type CachedRoster } from "./db"
import { trySyncAll } from "./syncEngine"

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}

export function useSyncQueue(teacherId: number | undefined) {
  return useLiveQuery(async () => {
    if (teacherId === undefined) return []

    const items = await offlineDB.attendanceQueue.where({ teacherId }).toArray()

    return items.sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))
  }, [teacherId])
}

// Auto-syncs on mount and whenever the browser regains connectivity.
export function useAutoSync(teacherId: number | undefined) {
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (teacherId === undefined || !isOnline) return

    trySyncAll(teacherId)
  }, [teacherId, isOnline])
}

export function useCachedRoster(
  teacherId: number | undefined,
  classId: number | undefined,
  subjectId: number | undefined,
): CachedRoster | undefined {
  return useLiveQuery(async () => {
    if (teacherId === undefined || classId === undefined || subjectId === undefined) return undefined

    return offlineDB.rosterCache.get(rosterCacheKey(teacherId, classId, subjectId))
  }, [teacherId, classId, subjectId])
}
