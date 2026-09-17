import { apiPost } from "@/lib/api";
import {
  getAuth,
  getSyncQueue,
  removeSyncOperation,
  type SyncOperation,
} from "@/db/indexedDb";

let syncing = false;

function getErrorStatus(error: unknown): number {
  if (typeof error === "object" && error !== null && "status" in error) {
    return Number((error as { status: unknown }).status);
  }

  return 0;
}

async function sendOperation(operation: SyncOperation): Promise<void> {
  if (operation.entityType === "session") {
    if (operation.operation === "CREATE") {
      await apiPost("/sessions", operation.payload);
      return;
    }

    if (operation.operation === "UPDATE") {
      const endedAt = operation.payload.endedAt;

      await apiPost(`/sessions/${operation.entityId}/end`, { endedAt });

      return;
    }

    return;
  }

  if (operation.entityType === "income") {
    if (operation.operation === "CREATE") {
      await apiPost("/money/income", operation.payload);
      return;
    }

    if (operation.operation === "VOID") {
      await apiPost(`/money/income/${operation.entityId}/void`, {});
      return;
    }

    return;
  }

  if (operation.entityType === "expense") {
    if (operation.operation === "CREATE") {
      await apiPost("/money/expense", operation.payload);
      return;
    }

    if (operation.operation === "VOID") {
      await apiPost(`/money/expense/${operation.entityId}/void`, {});
      return;
    }

    return;
  }

  if (operation.entityType === "change") {
    if (operation.operation === "CREATE") {
      await apiPost("/money/change", operation.payload);
      return;
    }

    if (operation.operation === "VOID") {
      await apiPost(`/money/change/${operation.entityId}/void`, {});
      return;
    }
  }
}

export async function syncNow(): Promise<void> {
  if (syncing) return;

  const auth = await getAuth();

  if (!auth?.token) return;

  if (!navigator.onLine) return;

  syncing = true;

  try {
    while (true) {
      const queue = await getSyncQueue();

      if (queue.length === 0) {
        break;
      }

      const operation = queue[0];

      try {
        await sendOperation(operation);

        await removeSyncOperation(operation.id);
      } catch (error) {
        const status = getErrorStatus(error);

        if (status === 401) {
          break;
        }

        if (!navigator.onLine) {
          break;
        }

        /*
         * Stop on any failed operation.
         *
         * The failed operation remains in IndexedDB.
         * Nothing after it is removed from the queue.
         *
         * This preserves ordering and lets the next sync
         * attempt retry the same operation.
         */
        break;
      }
    }
  } finally {
    syncing = false;
  }
}

export function startSyncEngine(): () => void {
  const handleOnline = () => {
    void syncNow();
  };

  window.addEventListener("online", handleOnline);

  const interval = window.setInterval(() => {
    if (navigator.onLine) {
      void syncNow();
    }
  }, 15_000);

  if (navigator.onLine) {
    void syncNow();
  }

  return () => {
    window.removeEventListener("online", handleOnline);

    window.clearInterval(interval);
  };
}
