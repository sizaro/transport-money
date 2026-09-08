import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  enqueueSync,
  getActiveSession,
  getChangeEntries,
  getCompletedSessions,
  getExpenses,
  getIncome,
  getOnboarding,
  saveActiveSession,
  saveChangeEntries,
  saveCompletedSessions,
  saveExpenses,
  saveIncome,
  saveOnboarding,
  type SyncOperation,
} from '@/db/indexedDb'

import type {
  ExpenseEntry,
  IncomeEntry,
  OnboardingData,
  Session,
} from '@/types/app'

import { startSyncEngine } from '@/lib/sync'

export interface ChangeEntry {
  id: string
  sessionId: string
  amountDue: number
  amountGiven: number
  changeReturned: number
  amountReceived: number
  createdAt: string
  voidedAt?: string
}

interface AppContextValue {
  onboarding: OnboardingData | null
  activeSession: Session | null
  completedSessions: Session[]
  income: IncomeEntry[]
  expenses: ExpenseEntry[]
  changeEntries: ChangeEntry[]
  completeOnboarding: (data: OnboardingData) => void
  startSession: () => void
  endSession: () => void
  addIncome: (amount: number) => void
  undoIncome: () => void
  addExpense: (category: string, amount: number) => void
  undoExpense: () => void
  addChange: (
    amountDue: number,
    amountGiven: number,
  ) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function now(): string {
  return new Date().toISOString()
}

function uuid(): string {
  return crypto.randomUUID()
}

export function AppProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [onboarding, setOnboarding] =
    useState<OnboardingData | null>(null)

  const [activeSession, setActiveSession] =
    useState<Session | null>(null)

  const [completedSessions, setCompletedSessions] =
    useState<Session[]>([])

  const [income, setIncome] =
    useState<IncomeEntry[]>([])

  const [expenses, setExpenses] =
    useState<ExpenseEntry[]>([])

  const [changeEntries, setChangeEntries] =
    useState<ChangeEntry[]>([])

  useEffect(() => {
    let mounted = true

    async function load() {
      const [
        savedOnboarding,
        savedActive,
        savedCompleted,
        savedIncome,
        savedExpenses,
        savedChanges,
      ] = await Promise.all([
        getOnboarding(),
        getActiveSession(),
        getCompletedSessions(),
        getIncome(),
        getExpenses(),
        getChangeEntries(),
      ])

      if (!mounted) return

      setOnboarding(savedOnboarding)
      setActiveSession(savedActive)
      setCompletedSessions(savedCompleted)
      setIncome(savedIncome)
      setExpenses(savedExpenses)
      setChangeEntries(savedChanges)
    }

    void load()

    const stopSync = startSyncEngine()

    return () => {
      mounted = false
      stopSync()
    }
  }, [])

  function completeOnboarding(data: OnboardingData) {
    setOnboarding(data)
    void saveOnboarding(data)
  }

  function startSession() {
    if (activeSession) return

    const session: Session = {
      id: uuid(),
      startedAt: now(),
      received: 0,
      expenses: 0,
    }

    setActiveSession(session)
    void saveActiveSession(session)

    const operation: SyncOperation = {
      id: uuid(),
      entityType: 'session',
      entityId: session.id,
      operation: 'CREATE',
      payload: {
        id: session.id,
        startedAt: session.startedAt,
      },
      createdAt: now(),
    }

    void enqueueSync(operation)
  }

  function endSession() {
    if (!activeSession) return

    const endedAt = now()

    const completedSession: Session = {
      ...activeSession,
      endedAt,
    }

    const nextCompleted = [
      ...completedSessions,
      completedSession,
    ]

    setCompletedSessions(nextCompleted)
    setActiveSession(null)

    void saveCompletedSessions(nextCompleted)
    void saveActiveSession(null)

    const operation: SyncOperation = {
      id: uuid(),
      entityType: 'session',
      entityId: activeSession.id,
      operation: 'UPDATE',
      payload: {
        endedAt,
      },
      createdAt: now(),
    }

    void enqueueSync(operation)
  }

  function addIncome(amount: number) {
    if (!activeSession || amount <= 0) return

    const entry: IncomeEntry = {
      id: uuid(),
      sessionId: activeSession.id,
      amount,
      createdAt: now(),
    }

    const nextIncome = [...income, entry]

    const nextSession: Session = {
      ...activeSession,
      received: activeSession.received + amount,
    }

    setIncome(nextIncome)
    setActiveSession(nextSession)

    void saveIncome(nextIncome)
    void saveActiveSession(nextSession)

    const operation: SyncOperation = {
      id: uuid(),
      entityType: 'income',
      entityId: entry.id,
      operation: 'CREATE',
      payload: {
        id: entry.id,
        sessionId: entry.sessionId,
        amount: entry.amount,
        createdAt: entry.createdAt,
      },
      createdAt: now(),
    }

    void enqueueSync(operation)
  }

  function undoIncome() {
    if (!activeSession) return

    const sessionIncome = income.filter(
      (entry) =>
        entry.sessionId === activeSession.id,
    )

    if (sessionIncome.length === 0) return

    const last =
      sessionIncome[sessionIncome.length - 1]

    const voidedAt = now()

    const nextIncome = income.map((entry) =>
      entry.id === last.id
        ? { ...entry, voidedAt }
        : entry,
    )

    const nextSession: Session = {
      ...activeSession,
      received: Math.max(
        0,
        activeSession.received - last.amount,
      ),
    }

    setIncome(nextIncome)
    setActiveSession(nextSession)

    void saveIncome(nextIncome)
    void saveActiveSession(nextSession)

    void enqueueSync({
      id: uuid(),
      entityType: 'income',
      entityId: last.id,
      operation: 'VOID',
      payload: {
        voidedAt,
      },
      createdAt: now(),
    })
  }

  function addExpense(
    category: string,
    amount: number,
  ) {
    if (
      !activeSession ||
      amount <= 0 ||
      !category.trim()
    ) {
      return
    }

    const entry: ExpenseEntry = {
      id: uuid(),
      sessionId: activeSession.id,
      category: category.trim(),
      amount,
      createdAt: now(),
    }

    const nextExpenses = [...expenses, entry]

    const nextSession: Session = {
      ...activeSession,
      expenses:
        activeSession.expenses + amount,
    }

    setExpenses(nextExpenses)
    setActiveSession(nextSession)

    void saveExpenses(nextExpenses)
    void saveActiveSession(nextSession)

    void enqueueSync({
      id: uuid(),
      entityType: 'expense',
      entityId: entry.id,
      operation: 'CREATE',
      payload: {
        id: entry.id,
        sessionId: entry.sessionId,
        category: entry.category,
        amount: entry.amount,
        createdAt: entry.createdAt,
      },
      createdAt: now(),
    })
  }

  function undoExpense() {
    if (!activeSession) return

    const sessionExpenses = expenses.filter(
      (entry) =>
        entry.sessionId === activeSession.id &&
        !entry.voidedAt,
    )

    if (sessionExpenses.length === 0) return

    const last =
      sessionExpenses[sessionExpenses.length - 1]

    const voidedAt = now()

    const nextExpenses = expenses.map((entry) =>
      entry.id === last.id
        ? { ...entry, voidedAt }
        : entry,
    )

    const nextSession: Session = {
      ...activeSession,
      expenses: Math.max(
        0,
        activeSession.expenses - last.amount,
      ),
    }

    setExpenses(nextExpenses)
    setActiveSession(nextSession)

    void saveExpenses(nextExpenses)
    void saveActiveSession(nextSession)

    void enqueueSync({
      id: uuid(),
      entityType: 'expense',
      entityId: last.id,
      operation: 'VOID',
      payload: {
        voidedAt,
      },
      createdAt: now(),
    })
  }

  function addChange(
    amountDue: number,
    amountGiven: number,
  ) {
    if (!activeSession) return
    if (
      amountDue <= 0 ||
      amountGiven < amountDue
    ) {
      return
    }

    const createdAt = now()
    const changeReturned =
      amountGiven - amountDue

    const change: ChangeEntry = {
      id: uuid(),
      sessionId: activeSession.id,
      amountDue,
      amountGiven,
      changeReturned,
      amountReceived: amountDue,
      createdAt,
    }

    const incomeEntry: IncomeEntry = {
      id: uuid(),
      sessionId: activeSession.id,
      amount: amountDue,
      createdAt,
    }

    const nextChanges = [
      ...changeEntries,
      change,
    ]

    const nextIncome = [
      ...income,
      incomeEntry,
    ]

    const nextSession: Session = {
      ...activeSession,
      received:
        activeSession.received + amountDue,
    }

    setChangeEntries(nextChanges)
    setIncome(nextIncome)
    setActiveSession(nextSession)

    void saveChangeEntries(nextChanges)
    void saveIncome(nextIncome)
    void saveActiveSession(nextSession)

    void enqueueSync({
      id: uuid(),
      entityType: 'change',
      entityId: change.id,
      operation: 'CREATE',
      payload: {
        id: change.id,
        incomeEntryId: incomeEntry.id,
        sessionId: change.sessionId,
        amountDue: change.amountDue,
        amountGiven: change.amountGiven,
        createdAt: change.createdAt,
      },
      createdAt,
    })
  }

  return (
    <AppContext.Provider
      value={{
        onboarding,
        activeSession,
        completedSessions,
        income,
        expenses,
        changeEntries,
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
  )
}

export function useApp() {
  const context = useContext(AppContext)

  if (!context) {
    throw new Error(
      'useApp must be used inside AppProvider',
    )
  }

  return context
}
