import {
  apiPost,
} from '@/lib/api'
import {
  getAuth,
  getSyncQueue,
  removeSyncOperation,
  type SyncOperation,
} from '@/db/indexedDb'

let syncing = false

async function sendOperation(
  operation: SyncOperation,
): Promise<void> {
  if (operation.entityType === 'session') {
    if (operation.operation === 'CREATE') {
      await apiPost('/sessions', operation.payload)
      return
    }

    if (operation.operation === 'UPDATE') {
      const endedAt = operation.payload.endedAt

      await apiPost(
        `/sessions/${operation.entityId}/end`,
        { endedAt },
      )

      return
    }

    return
  }

  if (operation.entityType === 'income') {
    if (operation.operation === 'CREATE') {
      await apiPost('/money/income', operation.payload)
      return
    }

    if (operation.operation === 'VOID') {
      await apiPost(
        `/money/income/${operation.entityId}/void`,
        {},
      )
      return
    }
  }

  if (operation.entityType === 'expense') {
    if (operation.operation === 'CREATE') {
      await apiPost('/money/expense', operation.payload)
      return
    }

    if (operation.operation === 'VOID') {
      await apiPost(
        `/money/expense/${operation.entityId}/void`,
        {},
      )
      return
    }
  }

  if (operation.entityType === 'change') {
    if (operation.operation === 'CREATE') {
      await apiPost('/money/change', operation.payload)
      return
    }

    if (operation.operation === 'VOID') {
      await apiPost(
        `/money/change/${operation.entityId}/void`,
        {},
      )
    }
  }
}

export async function syncNow(): Promise<void> {
  if (syncing) return

  const auth = await getAuth()

  if (!auth?.token) return

  syncing = true

  try {
    const queue = await getSyncQueue()

    for (const operation of queue) {
      try {
        await sendOperation(operation)
        await removeSyncOperation(operation.id)
      } catch (error) {
        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error
            ? Number((error as { status: unknown }).status)
            : 0

        if (status === 401) {
          break
        }

        if (!navigator.onLine) {
          break
        }

        break
      }
    }
  } finally {
    syncing = false
  }
}

export function startSyncEngine(): () => void {
  const handleOnline = () => {
    void syncNow()
  }

  window.addEventListener('online', handleOnline)

  const interval = window.setInterval(() => {
    if (navigator.onLine) {
      void syncNow()
    }
  }, 15_000)

  void syncNow()

  return () => {
    window.removeEventListener('online', handleOnline)
    window.clearInterval(interval)
  }
}
