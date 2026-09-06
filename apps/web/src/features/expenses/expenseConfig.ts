export const EXPENSE_CATEGORIES = [
  'Fuel',
  'Food',
  'Repair',
  'Parking/Stage',
  'Washing',
  'Other',
] as const

export const EXPENSE_QUICK_AMOUNTS = [
  500,
  1000,
  2000,
  3000,
  5000,
  10000,
  15000,
  20000,
  30000,
  50000,
] as const

export function formatExpenseAmount(amount: number) {
  return amount.toLocaleString('en-UG')
}
