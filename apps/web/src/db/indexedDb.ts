import type {
  ExpenseEntry,
  IncomeEntry,
  OnboardingData,
  Session,
} from "@/types/app";
import type { ChangeEntry } from "@/app/providers";

const DB_NAME = "transport-money";
const DB_VERSION = 2;
const STORE = "app";

const KEYS = {
  onboarding: "onboarding",
  activeSession: "activeSession",
  completedSessions: "completedSessions",
  income: "income",
  expenses: "expenses",
  changeEntries: "changeEntries",
  auth: "auth",
  syncQueue: "syncQueue",
  localDatabaseState: "localDatabaseState",
} as const;

export interface AuthState {
  token: string;
  userId: string;
  tenantId: string;
  deviceId: string;
  authSessionId: string;
  phone: string;
  name: string;
}

export interface LocalDatabaseState {
  initialized: boolean;
  initializedAt: string;
}

export type SyncOperation =
  | {
      id: string;
      entityType: "session";
      entityId: string;
      operation: "CREATE" | "UPDATE" | "VOID";
      payload: Record<string, unknown>;
      createdAt: string;
    }
  | {
      id: string;
      entityType: "income";
      entityId: string;
      operation: "CREATE" | "UPDATE" | "VOID";
      payload: Record<string, unknown>;
      createdAt: string;
    }
  | {
      id: string;
      entityType: "expense";
      entityId: string;
      operation: "CREATE" | "UPDATE" | "VOID";
      payload: Record<string, unknown>;
      createdAt: string;
    }
  | {
      id: string;
      entityType: "change";
      entityId: string;
      operation: "CREATE" | "UPDATE" | "VOID";
      payload: Record<string, unknown>;
      createdAt: string;
    };

interface AppDbRecord {
  key: string;
  value: unknown;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      databasePromise = null;
      reject(request.error);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      const db = request.result;

      db.onversionchange = () => {
        db.close();
        databasePromise = null;
      };

      resolve(db);
    };
  });

  return databasePromise;
}

async function read<T>(key: string): Promise<T | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).get(key);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      const result = request.result as AppDbRecord | undefined;

      resolve(result ? (result.value as T) : null);
    };
  });
}

async function write<T>(key: string, value: T): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    transaction.objectStore(STORE).put({
      key,
      value,
    } satisfies AppDbRecord);
  });
}

async function remove(key: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    transaction.objectStore(STORE).delete(key);
  });
}

export async function getOnboarding(): Promise<OnboardingData | null> {
  return read<OnboardingData>(KEYS.onboarding);
}

export async function saveOnboarding(data: OnboardingData): Promise<void> {
  await write(KEYS.onboarding, data);
}

export async function getActiveSession(): Promise<Session | null> {
  return read<Session>(KEYS.activeSession);
}

export async function saveActiveSession(
  session: Session | null,
): Promise<void> {
  if (session) {
    await write(KEYS.activeSession, session);
  } else {
    await remove(KEYS.activeSession);
  }
}

export async function getCompletedSessions(): Promise<Session[]> {
  return (await read<Session[]>(KEYS.completedSessions)) ?? [];
}

export async function saveCompletedSessions(
  sessions: Session[],
): Promise<void> {
  await write(KEYS.completedSessions, sessions);
}

export async function getIncome(): Promise<IncomeEntry[]> {
  return (await read<IncomeEntry[]>(KEYS.income)) ?? [];
}

export async function saveIncome(entries: IncomeEntry[]): Promise<void> {
  await write(KEYS.income, entries);
}

export async function getExpenses(): Promise<ExpenseEntry[]> {
  return (await read<ExpenseEntry[]>(KEYS.expenses)) ?? [];
}

export async function saveExpenses(entries: ExpenseEntry[]): Promise<void> {
  await write(KEYS.expenses, entries);
}

export async function getChangeEntries(): Promise<ChangeEntry[]> {
  return (await read<ChangeEntry[]>(KEYS.changeEntries)) ?? [];
}

export async function saveChangeEntries(entries: ChangeEntry[]): Promise<void> {
  await write(KEYS.changeEntries, entries);
}

export async function getAuth(): Promise<AuthState | null> {
  return read<AuthState>(KEYS.auth);
}

export async function saveAuth(auth: AuthState): Promise<void> {
  await write(KEYS.auth, auth);
}

export async function clearAuth(): Promise<void> {
  await remove(KEYS.auth);
}

export async function getLocalDatabaseState(): Promise<LocalDatabaseState | null> {
  return read<LocalDatabaseState>(KEYS.localDatabaseState);
}

export async function markLocalDatabaseInitialized(): Promise<void> {
  await write(KEYS.localDatabaseState, {
    initialized: true,
    initializedAt: new Date().toISOString(),
  } satisfies LocalDatabaseState);
}

export async function isLocalDatabaseInitialized(): Promise<boolean> {
  const state = await getLocalDatabaseState();

  return state?.initialized === true;
}

export async function getSyncQueue(): Promise<SyncOperation[]> {
  return (await read<SyncOperation[]>(KEYS.syncQueue)) ?? [];
}

async function updateSyncQueue(
  updater: (queue: SyncOperation[]) => SyncOperation[],
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);

    const getRequest = store.get(KEYS.syncQueue);

    getRequest.onerror = () => {
      reject(getRequest.error);
    };

    getRequest.onsuccess = () => {
      const result = getRequest.result as AppDbRecord | undefined;

      const currentQueue = result ? (result.value as SyncOperation[]) : [];

      const nextQueue = updater(currentQueue);

      store.put({
        key: KEYS.syncQueue,
        value: nextQueue,
      } satisfies AppDbRecord);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.onabort = () => {
      reject(transaction.error);
    };

    transaction.oncomplete = () => {
      resolve();
    };
  });
}

export async function saveSyncQueue(queue: SyncOperation[]): Promise<void> {
  await write(KEYS.syncQueue, queue);
}

export async function enqueueSync(operation: SyncOperation): Promise<void> {
  await updateSyncQueue((queue) => {
    if (queue.some((item) => item.id === operation.id)) {
      return queue;
    }

    return [...queue, operation];
  });
}

export async function removeSyncOperation(operationId: string): Promise<void> {
  await updateSyncQueue((queue) =>
    queue.filter((operation) => operation.id !== operationId),
  );
}

export async function clearLocalData(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    transaction.objectStore(STORE).clear();
  });
}
