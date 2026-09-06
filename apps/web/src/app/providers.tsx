import { createContext, useContext, useState } from 'react'
import {
  getActiveSession,
  getCompletedSessions,
  getExpenses,
  getIncome,
  getOnboarding,
  saveActiveSession,
  saveCompletedSessions,
  saveExpenses,
  saveIncome,
  saveOnboarding,
} from '@/db/localStore'
import type {
  ExpenseEntry,
  IncomeEntry,
  OnboardingData,
  Session,
} from '@/types/app'

export interface ChangeEntry {
  id: string
  sessionId: string
  amountDue: number
  amountGiven: number
  changeReturned: number
  amountReceived: number
  createdAt: string
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

const CHANGE_KEY = 'transport-money:change'

function getChangeEntries(): ChangeEntry[] {
  const value = localStorage.getItem(CHANGE_KEY)

  if (!value) return []

  try {
    return JSON.parse(value) as ChangeEntry[]
  } catch {
    return []
  }
}

function saveChangeEntries(entries: ChangeEntry[]) {
  localStorage.setItem(CHANGE_KEY, JSON.stringify(entries))
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [onboarding, setOnboarding] = useState(getOnboarding)
  const [activeSession, setActiveSession] = useState(getActiveSession)
  const [completedSessions, setCompletedSessions] = useState(
    getCompletedSessions,
  )
  const [income, setIncome] = useState(getIncome)
  const [expenses, setExpenses] = useState(getExpenses)
  const [changeEntries, setChangeEntries] = useState(
    getChangeEntries,
  )

  function completeOnboarding(data: OnboardingData) {
    saveOnboarding(data)
    setOnboarding(data)
  }

  function startSession() {
    if (activeSession) return

    const session: Session = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      received: 0,
      expenses: 0,
    }

    saveActiveSession(session)
    setActiveSession(session)
  }

  function endSession() {
    if (!activeSession) return

    const completedSession: Session = {
      ...activeSession,
      endedAt: new Date().toISOString(),
    }

    const nextCompletedSessions = [
      ...completedSessions,
      completedSession,
    ]

    saveCompletedSessions(nextCompletedSessions)
    saveActiveSession(null)

    setCompletedSessions(nextCompletedSessions)
    setActiveSession(null)
  }

  function addIncome(amount: number) {
    if (!activeSession || amount <= 0) return

    const entry: IncomeEntry = {
      id: crypto.randomUUID(),
      sessionId: activeSession.id,
      amount,
      createdAt: new Date().toISOString(),
    }

    const nextIncome = [...income, entry]

    const nextSession: Session = {
      ...activeSession,
      received: activeSession.received + amount,
    }

    saveIncome(nextIncome)
    saveActiveSession(nextSession)

    setIncome(nextIncome)
    setActiveSession(nextSession)
  }

  function undoIncome() {
    if (!activeSession) return

    const sessionIncome = income.filter(
      (entry) => entry.sessionId === activeSession.id,
    )

    if (sessionIncome.length === 0) return

    const last = sessionIncome[sessionIncome.length - 1]

    const nextIncome = income.filter(
      (entry) => entry.id !== last.id,
    )

    const nextSession: Session = {
      ...activeSession,
      received: Math.max(
        0,
        activeSession.received - last.amount,
      ),
    }

    saveIncome(nextIncome)
    saveActiveSession(nextSession)

    setIncome(nextIncome)
    setActiveSession(nextSession)
  }

  function addExpense(category: string, amount: number) {
    if (!activeSession || amount <= 0 || !category.trim()) return

    const entry: ExpenseEntry = {
      id: crypto.randomUUID(),
      sessionId: activeSession.id,
      category: category.trim(),
      amount,
      createdAt: new Date().toISOString(),
    }

    const nextExpenses = [...expenses, entry]

    const nextSession: Session = {
      ...activeSession,
      expenses: activeSession.expenses + amount,
    }

    saveExpenses(nextExpenses)
    saveActiveSession(nextSession)

    setExpenses(nextExpenses)
    setActiveSession(nextSession)
  }

  function undoExpense() {
    if (!activeSession) return

    const sessionExpenses = expenses.filter(
      (entry) => entry.sessionId === activeSession.id,
    )

    if (sessionExpenses.length === 0) return

    const last = sessionExpenses[sessionExpenses.length - 1]

    const nextExpenses = expenses.filter(
      (entry) => entry.id !== last.id,
    )

    const nextSession: Session = {
      ...activeSession,
      expenses: Math.max(
        0,
        activeSession.expenses - last.amount,
      ),
    }

    saveExpenses(nextExpenses)
    saveActiveSession(nextSession)

    setExpenses(nextExpenses)
    setActiveSession(nextSession)
  }

  function addChange(
    amountDue: number,
    amountGiven: number,
  ) {
    if (!activeSession) return
    if (amountDue <= 0 || amountGiven < amountDue) return

    const changeReturned = amountGiven - amountDue

    const entry: ChangeEntry = {
      id: crypto.randomUUID(),
      sessionId: activeSession.id,
      amountDue,
      amountGiven,
      changeReturned,
      amountReceived: amountDue,
      createdAt: new Date().toISOString(),
    }

    const nextChanges = [...changeEntries, entry]

    const incomeEntry: IncomeEntry = {
      id: crypto.randomUUID(),
      sessionId: activeSession.id,
      amount: amountDue,
      createdAt: entry.createdAt,
    }

    const nextIncome = [...income, incomeEntry]

    const nextSession: Session = {
      ...activeSession,
      received: activeSession.received + amountDue,
    }

    saveChangeEntries(nextChanges)
    saveIncome(nextIncome)
    saveActiveSession(nextSession)

    setChangeEntries(nextChanges)
    setIncome(nextIncome)
    setActiveSession(nextSession)
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
    throw new Error('useApp must be used inside AppProvider')
  }

  return context
}
