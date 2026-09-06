export const CHANGE_FARE_AMOUNTS = [
  500,
  1000,
  1500,
  2000,
  2500,
  3000,
  4000,
  5000,
  10000,
] as const

export const CHANGE_GIVEN_AMOUNTS = [
  500,
  1000,
  2000,
  5000,
  10000,
  20000,
  50000,
] as const

export function formatChangeMoney(amount: number) {
  return amount.toLocaleString('en-UG')
}

export function formatChangeQuickAmount(amount: number) {
  if (amount >= 1000) {
    const value = amount / 1000
    return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}K`
  }

  return amount.toLocaleString('en-UG')
}
