import type {
  ExpenseEntry,
  IncomeEntry,
  OnboardingData,
  Session,
} from '@/types/app'

const KEYS = {
  onboarding: 'transport-money:onboarding',
  activeSession: 'transport-money:active-session',
  completedSessions: 'transport-money:completed-sessions',
  income: 'transport-money:income',
  expenses: 'transport-money:expenses',
} as const

function read<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key)

  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getOnboarding(): OnboardingData | null {
  return read<OnboardingData | null>(KEYS.onboarding, null)
}

export function saveOnboarding(data: OnboardingData) {
  write(KEYS.onboarding, data)
}

export function getActiveSession(): Session | null {
  return read<Session | null>(KEYS.activeSession, null)
}

export function saveActiveSession(session: Session | null) {
  write(KEYS.activeSession, session)
}

export function getCompletedSessions(): Session[] {
  return read<Session[]>(KEYS.completedSessions, [])
}

export function saveCompletedSessions(sessions: Session[]) {
  write(KEYS.completedSessions, sessions)
}

export function getIncome(): IncomeEntry[] {
  return read<IncomeEntry[]>(KEYS.income, [])
}

export function saveIncome(entries: IncomeEntry[]) {
  write(KEYS.income, entries)
}

export function getExpenses(): ExpenseEntry[] {
  return read<ExpenseEntry[]>(KEYS.expenses, [])
}

export function saveExpenses(entries: ExpenseEntry[]) {
  write(KEYS.expenses, entries)
}
