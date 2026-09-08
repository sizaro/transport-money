export type VehicleType = 'boda' | 'vehicle'

export interface OnboardingData {
  vehicleType: VehicleType
  phone: string
  name: string
  completed: boolean
}

export interface Session {
  id: string
  startedAt: string
  endedAt?: string
  received: number
  expenses: number
}

export interface IncomeEntry {
  id: string
  sessionId: string
  amount: number
  createdAt: string
  voidedAt?: string
}

export interface ExpenseEntry {
  id: string
  sessionId: string
  category: string
  amount: number
  createdAt: string
  voidedAt?: string
}
