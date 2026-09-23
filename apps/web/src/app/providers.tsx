import { createContext, useContext, useEffect, useRef, useState } from "react";

import {
  enqueueSync,
  getActiveSession,
  getAuth,
  getChangeEntries,
  getCompletedSessions,
  getExpenses,
  getIncome,
  getOnboarding,
  isLocalDatabaseInitialized,
  markLocalDatabaseInitialized,
  saveActiveSession,
  saveChangeEntries,
  saveCompletedSessions,
  saveExpenses,
  saveIncome,
  saveOnboarding,
  type AuthState,
  type SyncOperation,
} from "@/db/indexedDb";

import type {
  ExpenseEntry,
  IncomeEntry,
  OnboardingData,
  Session,
} from "@/types/app";

import { startSyncEngine } from "@/lib/sync";

export interface ChangeEntry {
  id: string;
  sessionId: string;
  amountDue: number;
  amountGiven: number;
  changeReturned: number;
  amountReceived: number;
  createdAt: string;
  voidedAt?: string;
  incomeEntryId?: string;
}

interface AppContextValue {
  auth: AuthState | null;
  onboarding: OnboardingData | null;
  activeSession: Session | null;
  completedSessions: Session[];
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  changeEntries: ChangeEntry[];
  setAuthenticatedUser: (auth: AuthState) => void;
  clearAuthenticatedUser: () => void;
  completeOnboarding: (data: OnboardingData) => void;
  startSession: () => void;
  endSession: () => void;
  addIncome: (amount: number) => void;
  undoIncome: () => void;
  addExpense: (category: string, amount: number) => void;
  undoExpense: () => void;
  addChange: (amountDue: number, amountGiven: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function now(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

function calculateSessionReceived(
  sessionId: string,
  income: IncomeEntry[],
): number {
  return income
    .filter((entry) => entry.sessionId === sessionId && !entry.voidedAt)
    .reduce((total, entry) => total + entry.amount, 0);
}

function calculateSessionExpenses(
  sessionId: string,
  expenses: ExpenseEntry[],
): number {
  return expenses
    .filter((entry) => entry.sessionId === sessionId && !entry.voidedAt)
    .reduce((total, entry) => total + entry.amount, 0);
}

function buildSessionWithTotals(
  session: Session,
  income: IncomeEntry[],
  expenses: ExpenseEntry[],
): Session {
  return {
    ...session,
    received: calculateSessionReceived(session.id, income),
    expenses: calculateSessionExpenses(session.id, expenses),
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);

  const [auth, setAuth] = useState<AuthState | null>(null);

  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);

  const [activeSession, setActiveSession] = useState<Session | null>(null);

  const [completedSessions, setCompletedSessions] = useState<Session[]>([]);

  const [income, setIncome] = useState<IncomeEntry[]>([]);

  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);

  const [changeEntries, setChangeEntries] = useState<ChangeEntry[]>([]);

  /*
   * These refs mirror React state and are updated
   * immediately inside mutations.
   *
   * This prevents rapid taps from calculating the next
   * operation from stale React state.
   */
  const activeSessionRef = useRef<Session | null>(null);

  const completedSessionsRef = useRef<Session[]>([]);

  const incomeRef = useRef<IncomeEntry[]>([]);

  const expensesRef = useRef<ExpenseEntry[]>([]);

  const changeEntriesRef = useRef<ChangeEntry[]>([]);

  /*
   * Local persistence is serialized.
   *
   * The UI changes immediately, while IndexedDB writes
   * happen in the same order as the user's actions.
   */
  const persistenceChainRef = useRef<Promise<void>>(Promise.resolve());

  function persist(operation: () => Promise<void>) {
    persistenceChainRef.current = persistenceChainRef.current
      .then(operation)
      .catch((error) => {
        console.error("Local persistence failed:", error);
      });
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [
          savedAuth,
          savedOnboarding,
          savedActive,
          savedCompleted,
          savedIncome,
          savedExpenses,
          savedChanges,
          initialized,
        ] = await Promise.all([
          getAuth(),
          getOnboarding(),
          getActiveSession(),
          getCompletedSessions(),
          getIncome(),
          getExpenses(),
          getChangeEntries(),
          isLocalDatabaseInitialized(),
        ]);

        if (!mounted) return;

        /*
         * Auth is also local application state.
         *
         * Load it before the application is rendered so
         * the router can determine whether the user is
         * already authenticated.
         */
        setAuth(savedAuth);

        /*
         * The actual transaction entries are the source
         * of truth.
         *
         * Rebuild session totals from those entries instead
         * of trusting cached session totals.
         */
        const rebuiltActive = savedActive
          ? buildSessionWithTotals(savedActive, savedIncome, savedExpenses)
          : null;

        const rebuiltCompleted = savedCompleted.map((session) =>
          buildSessionWithTotals(session, savedIncome, savedExpenses),
        );

        activeSessionRef.current = rebuiltActive;

        completedSessionsRef.current = rebuiltCompleted;

        incomeRef.current = savedIncome;

        expensesRef.current = savedExpenses;

        changeEntriesRef.current = savedChanges;

        setOnboarding(savedOnboarding);
        setActiveSession(rebuiltActive);
        setCompletedSessions(rebuiltCompleted);
        setIncome(savedIncome);
        setExpenses(savedExpenses);
        setChangeEntries(savedChanges);

        /*
         * Existing users may have data from an older
         * IndexedDB version before the initialized marker
         * existed.
         *
         * Existing local data means the local database
         * must remain authoritative.
         */
        const hasExistingLocalState =
          initialized ||
          savedAuth !== null ||
          savedOnboarding !== null ||
          savedActive !== null ||
          savedCompleted.length > 0 ||
          savedIncome.length > 0 ||
          savedExpenses.length > 0 ||
          savedChanges.length > 0;

        if (hasExistingLocalState && !initialized) {
          await markLocalDatabaseInitialized();
        }

        if (!mounted) return;

        /*
         * Do not allow the application UI to render before
         * IndexedDB has finished loading.
         */
        setHydrated(true);
      } catch (error) {
        console.error("Failed to hydrate local application state:", error);

        if (mounted) {
          /*
           * We allow the application to render after the
           * load attempt finishes, but we do not replace
           * local data with server data.
           */
          setHydrated(true);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * Start synchronization only after IndexedDB hydration
   * has completed.
   */
  useEffect(() => {
    if (!hydrated) return;

    const stopSync = startSyncEngine();

    return () => {
      stopSync();
    };
  }, [hydrated]);

  /*
   * Update the in-memory authentication state immediately
   * after a successful login.
   *
   * IndexedDB remains the persistent source of truth.
   * This method only keeps the React state synchronized
   * with the authentication data already saved locally.
   */
  function setAuthenticatedUser(nextAuth: AuthState) {
    setAuth(nextAuth);
  }

  /*
   * Clear only the in-memory authentication state.
   *
   * The actual IndexedDB auth record is cleared by the
   * logout flow in api.ts. Local transaction data is not
   * touched here because it may contain unsynced offline
   * work.
   */
  function clearAuthenticatedUser() {
    setAuth(null);
  }

  function completeOnboarding(data: OnboardingData) {
    setOnboarding(data);

    persist(async () => {
      await saveOnboarding(data);
      await markLocalDatabaseInitialized();
    });
  }

  function startSession() {
    if (activeSessionRef.current) return;

    const session: Session = {
      id: uuid(),
      startedAt: now(),
      received: 0,
      expenses: 0,
    };

    activeSessionRef.current = session;

    setActiveSession(session);

    const operation: SyncOperation = {
      id: uuid(),
      entityType: "session",
      entityId: session.id,
      operation: "CREATE",
      payload: {
        id: session.id,
        startedAt: session.startedAt,
      },
      createdAt: now(),
    };

    persist(async () => {
      await saveActiveSession(session);
      await enqueueSync(operation);
    });
  }

  function endSession() {
    const currentSession = activeSessionRef.current;

    if (!currentSession) return;

    const endedAt = now();

    const completedSession = buildSessionWithTotals(
      {
        ...currentSession,
        endedAt,
      },
      incomeRef.current,
      expensesRef.current,
    );

    const nextCompleted = [...completedSessionsRef.current, completedSession];

    activeSessionRef.current = null;

    completedSessionsRef.current = nextCompleted;

    setActiveSession(null);
    setCompletedSessions(nextCompleted);

    const operation: SyncOperation = {
      id: uuid(),
      entityType: "session",
      entityId: currentSession.id,
      operation: "UPDATE",
      payload: {
        endedAt,
      },
      createdAt: now(),
    };

    persist(async () => {
      await saveCompletedSessions(nextCompleted);

      await saveActiveSession(null);

      await enqueueSync(operation);
    });
  }

  function addIncome(amount: number) {
    const currentSession = activeSessionRef.current;

    if (!currentSession || amount <= 0) {
      return;
    }

    const entry: IncomeEntry = {
      id: uuid(),
      sessionId: currentSession.id,
      amount,
      createdAt: now(),
    };

    /*
     * Every tap is an independent transaction.
     */
    const nextIncome = [...incomeRef.current, entry];

    incomeRef.current = nextIncome;

    const nextSession = buildSessionWithTotals(
      currentSession,
      nextIncome,
      expensesRef.current,
    );

    activeSessionRef.current = nextSession;

    setIncome(nextIncome);
    setActiveSession(nextSession);

    const operation: SyncOperation = {
      id: uuid(),
      entityType: "income",
      entityId: entry.id,
      operation: "CREATE",
      payload: {
        id: entry.id,
        sessionId: entry.sessionId,
        amount: entry.amount,
        createdAt: entry.createdAt,
      },
      createdAt: now(),
    };

    persist(async () => {
      await saveIncome(nextIncome);
      await saveActiveSession(nextSession);
      await enqueueSync(operation);
    });
  }

  function undoIncome() {
    const currentSession = activeSessionRef.current;

    if (!currentSession) return;

    const sessionIncome = incomeRef.current.filter(
      (entry) => entry.sessionId === currentSession.id && !entry.voidedAt,
    );

    if (sessionIncome.length === 0) {
      return;
    }

    const last = sessionIncome[sessionIncome.length - 1];

    const voidedAt = now();

    const nextIncome = incomeRef.current.map((entry) =>
      entry.id === last.id
        ? {
            ...entry,
            voidedAt,
          }
        : entry,
    );

    const nextChanges = changeEntriesRef.current.map((change) =>
      change.incomeEntryId === last.id
        ? {
            ...change,
            voidedAt,
          }
        : change,
    );

    incomeRef.current = nextIncome;

    changeEntriesRef.current = nextChanges;

    const nextSession = buildSessionWithTotals(
      currentSession,
      nextIncome,
      expensesRef.current,
    );

    activeSessionRef.current = nextSession;

    setIncome(nextIncome);
    setChangeEntries(nextChanges);
    setActiveSession(nextSession);

    const operation: SyncOperation = {
      id: uuid(),
      entityType: "income",
      entityId: last.id,
      operation: "VOID",
      payload: {
        voidedAt,
      },
      createdAt: now(),
    };

    persist(async () => {
      await saveIncome(nextIncome);
      await saveChangeEntries(nextChanges);
      await saveActiveSession(nextSession);
      await enqueueSync(operation);
    });
  }

  function addExpense(category: string, amount: number) {
    const currentSession = activeSessionRef.current;

    const normalizedCategory = category.trim();

    if (!currentSession || amount <= 0 || !normalizedCategory) {
      return;
    }

    const entry: ExpenseEntry = {
      id: uuid(),
      sessionId: currentSession.id,
      category: normalizedCategory,
      amount,
      createdAt: now(),
    };

    const nextExpenses = [...expensesRef.current, entry];

    expensesRef.current = nextExpenses;

    const nextSession = buildSessionWithTotals(
      currentSession,
      incomeRef.current,
      nextExpenses,
    );

    activeSessionRef.current = nextSession;

    setExpenses(nextExpenses);
    setActiveSession(nextSession);

    const operation: SyncOperation = {
      id: uuid(),
      entityType: "expense",
      entityId: entry.id,
      operation: "CREATE",
      payload: {
        id: entry.id,
        sessionId: entry.sessionId,
        category: entry.category,
        amount: entry.amount,
        createdAt: entry.createdAt,
      },
      createdAt: now(),
    };

    persist(async () => {
      await saveExpenses(nextExpenses);
      await saveActiveSession(nextSession);
      await enqueueSync(operation);
    });
  }

  function undoExpense() {
    const currentSession = activeSessionRef.current;

    if (!currentSession) return;

    const sessionExpenses = expensesRef.current.filter(
      (entry) => entry.sessionId === currentSession.id && !entry.voidedAt,
    );

    if (sessionExpenses.length === 0) {
      return;
    }

    const last = sessionExpenses[sessionExpenses.length - 1];

    const voidedAt = now();

    const nextExpenses = expensesRef.current.map((entry) =>
      entry.id === last.id
        ? {
            ...entry,
            voidedAt,
          }
        : entry,
    );

    expensesRef.current = nextExpenses;

    const nextSession = buildSessionWithTotals(
      currentSession,
      incomeRef.current,
      nextExpenses,
    );

    activeSessionRef.current = nextSession;

    setExpenses(nextExpenses);
    setActiveSession(nextSession);

    const operation: SyncOperation = {
      id: uuid(),
      entityType: "expense",
      entityId: last.id,
      operation: "VOID",
      payload: {
        voidedAt,
      },
      createdAt: now(),
    };

    persist(async () => {
      await saveExpenses(nextExpenses);
      await saveActiveSession(nextSession);
      await enqueueSync(operation);
    });
  }

  function addChange(amountDue: number, amountGiven: number) {
    const currentSession = activeSessionRef.current;

    if (!currentSession) return;

    if (amountDue <= 0 || amountGiven < amountDue) {
      return;
    }

    const createdAt = now();

    const changeReturned = amountGiven - amountDue;

    const incomeEntry: IncomeEntry = {
      id: uuid(),
      sessionId: currentSession.id,
      amount: amountDue,
      createdAt,
    };

    const change: ChangeEntry = {
      id: uuid(),
      sessionId: currentSession.id,
      amountDue,
      amountGiven,
      changeReturned,
      amountReceived: amountDue,
      createdAt,
      incomeEntryId: incomeEntry.id,
    };

    const nextIncome = [...incomeRef.current, incomeEntry];

    const nextChanges = [...changeEntriesRef.current, change];

    incomeRef.current = nextIncome;

    changeEntriesRef.current = nextChanges;

    const nextSession = buildSessionWithTotals(
      currentSession,
      nextIncome,
      expensesRef.current,
    );

    activeSessionRef.current = nextSession;

    setIncome(nextIncome);
    setChangeEntries(nextChanges);
    setActiveSession(nextSession);

    const operation: SyncOperation = {
      id: uuid(),
      entityType: "change",
      entityId: change.id,
      operation: "CREATE",
      payload: {
        id: change.id,
        incomeEntryId: incomeEntry.id,
        sessionId: change.sessionId,
        amountDue: change.amountDue,
        amountGiven: change.amountGiven,
        createdAt: change.createdAt,
      },
      createdAt,
    };

    persist(async () => {
      await saveChangeEntries(nextChanges);
      await saveIncome(nextIncome);
      await saveActiveSession(nextSession);
      await enqueueSync(operation);
    });
  }

  /*
   * Do not render the application before local state
   * has been hydrated.
   */
  if (!hydrated) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Transport Money
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Loading your local data...
          </p>
        </div>
      </main>
    );
  }

  return (
    <AppContext.Provider
      value={{
        auth,
        onboarding,
        activeSession,
        completedSessions,
        income,
        expenses,
        changeEntries,
        setAuthenticatedUser,
        clearAuthenticatedUser,
        completeOnboarding,
        startSession,
        endSession,
        addIncome,
        undoIncome,
        addExpense,
        undoExpense,
        addChange,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }

  return context;
}
