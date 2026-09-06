import { useMemo, useState } from 'react'
import {
  CircleAlert,
  Fuel,
  MoreHorizontal,
  ParkingCircle,
  ReceiptText,
  RotateCcw,
  Utensils,
  Wrench,
} from 'lucide-react'

import { useApp } from '@/app/providers'
import { Button } from '@/components/ui/button'
import {
  EXPENSE_CATEGORIES,
  EXPENSE_QUICK_AMOUNTS,
  formatExpenseAmount,
} from '@/features/expenses/expenseConfig'

function categoryIcon(category: string) {
  if (category === 'Fuel') return Fuel
  if (category === 'Food') return Utensils
  if (category === 'Repair') return Wrench
  if (category === 'Parking/Stage') return ParkingCircle
  if (category === 'Washing') return RotateCcw
  return MoreHorizontal
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('en-UG', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ExpensesScreen() {
  const {
    activeSession,
    expenses,
    addExpense,
    undoExpense,
  } = useApp()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    null,
  )

  const sessionExpenses = useMemo(
    () =>
      activeSession
        ? expenses
            .filter((entry) => entry.sessionId === activeSession.id)
            .slice(-2)
            .reverse()
        : [],
    [activeSession, expenses],
  )

  function chooseCategory(category: string) {
    if (!activeSession) {
      window.alert('Start a working session first.')
      return
    }

    setSelectedCategory(category)
  }

  function recordExpense(amount: number) {
    if (!selectedCategory) return

    addExpense(selectedCategory, amount)
    setSelectedCategory(null)
  }

  function handleOther() {
    const value = window.prompt('Enter expense amount')

    if (value === null) return

    const amount = Number(
      value.replace(/,/g, '').trim(),
    )

    if (!Number.isInteger(amount) || amount <= 0) {
      window.alert('Enter a valid whole-number amount.')
      return
    }

    recordExpense(amount)
  }

  function handleUndo() {
    if (!activeSession) return

    const sessionExpenses = expenses.filter(
      (entry) => entry.sessionId === activeSession.id,
    )

    if (sessionExpenses.length === 0) return

    const last = sessionExpenses[sessionExpenses.length - 1]

    const confirmed = window.confirm(
      `Undo ${last.category} expense of UGX ${formatExpenseAmount(last.amount)}? Recorded at ${formatTime(last.createdAt)}.`,
    )

    if (confirmed) {
      undoExpense()
    }
  }

  if (!activeSession) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-6 text-center shadow-sm">
          <ReceiptText className="mx-auto size-8 text-muted-foreground" />

          <h1 className="mt-4 text-xl font-semibold">
            No active session
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Start a working session before recording an expense.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
      <section className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
              WORK EXPENSES
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Expenses
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Record what you spend while working.
            </p>
          </div>

          {expenses.some(
            (entry) => entry.sessionId === activeSession.id,
          ) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
            >
              Undo last
            </Button>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground">
            EXPENSES THIS SESSION
          </p>

          <p className="mt-2 text-3xl font-bold">
            {formatExpenseAmount(activeSession.expenses)}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            UGX
          </p>
        </div>

        {selectedCategory === null ? (
          <div className="space-y-3">
            <div>
              <h2 className="font-semibold">What did you spend on?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose a category.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {EXPENSE_CATEGORIES.map((category) => {
                const Icon = categoryIcon(category)

                return (
                  <Button
                    key={category}
                    type="button"
                    variant="outline"
                    className="h-20 justify-start gap-3 px-4"
                    onClick={() => chooseCategory(category)}
                  >
                    <Icon className="size-5" />
                    <span>{category}</span>
                  </Button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">
                  EXPENSE
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  {selectedCategory}
                </h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setSelectedCategory(null)}
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {EXPENSE_QUICK_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={() => recordExpense(amount)}
                >
                  {amount >= 1000
                    ? `${amount / 1000}K`
                    : amount.toLocaleString('en-UG')}
                </Button>
              ))}

              <Button
                type="button"
                variant="secondary"
                className="h-12"
                onClick={handleOther}
              >
                Other
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-4 py-4">
            <h2 className="font-semibold">Recent expenses</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Only the latest two are shown here.
            </p>
          </div>

          {sessionExpenses.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CircleAlert className="mx-auto size-6 text-muted-foreground" />

              <p className="mt-2 text-sm text-muted-foreground">
                No expenses recorded yet.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sessionExpenses.map((expense) => {
                const Icon = categoryIcon(expense.category)

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between gap-4 px-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Icon className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {expense.category}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {formatTime(expense.createdAt)}
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 font-bold">
                      {formatExpenseAmount(expense.amount)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
