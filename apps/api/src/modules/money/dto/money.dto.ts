export interface AddIncomeDto {
  id?: string
  sessionId?: string
  amount: number
  entryMethod?: 'QUICK_AMOUNT' | 'OTHER' | 'CHANGE'
  createdAt?: string
}

export interface AddExpenseDto {
  id?: string
  sessionId?: string
  category: string
  amount: number
  createdAt?: string
}

export interface AddChangeDto {
  id?: string
  incomeEntryId?: string
  sessionId?: string
  amountDue: number
  amountGiven: number
  createdAt?: string
}
