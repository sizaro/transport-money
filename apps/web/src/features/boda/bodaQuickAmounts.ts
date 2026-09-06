export const BODA_QUICK_AMOUNTS = [
  500,
  1000,
  1500,
  2000,
  2500,
  3000,
  4000,
  5000,
  6000,
  7000,
  8000,
  10000,
  12000,
  15000,
  20000,
  25000,
  30000,
  50000,
] as const

/**
 * Full money display.
 *
 * This is used when showing actual recorded money:
 *
 * 100       -> 100
 * 500       -> 500
 * 1000      -> 1,000
 * 4500      -> 4,500
 * 10000     -> 10,000
 * 125000    -> 125,000
 */
export function formatMoney(amount: number) {
  return amount.toLocaleString('en-UG')
}

/**
 * Compact display for quick-action buttons.
 *
 * 100       -> 100
 * 500       -> 500
 * 1000      -> 1K
 * 1500      -> 1.5K
 * 2500      -> 2.5K
 * 10000     -> 10K
 * 50000     -> 50K
 */
export function formatQuickAmount(amount: number) {
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000
    return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}M`
  }

  if (amount >= 1_000) {
    const value = amount / 1_000
    return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}K`
  }

  return amount.toLocaleString('en-UG')
}
