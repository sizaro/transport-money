import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Clock3,
  Fuel,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { useApp } from '@/app/providers'
import { formatMoney } from '@/features/boda/bodaQuickAmounts'
import type { ExpenseEntry, IncomeEntry, Session } from '@/types/app'

type ReportPeriod = 'sessions' | 'day' | 'week' | 'month' | 'year'

type ReportRange = {
  start: Date
  end: Date
}

type Activity =
  | {
      type: 'income'
      id: string
      createdAt: string
      amount: number
    }
  | {
      type: 'expense'
      id: string
      createdAt: string
      amount: number
      category: string
    }

function formatDurationMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60

  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function formatDuration(startedAt: string, endedAt?: string) {
  if (!endedAt) return 'Running'

  const elapsed =
    new Date(endedAt).getTime() - new Date(startedAt).getTime()

  return formatDurationMinutes(elapsed / 60000)
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-UG', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRangeDate(value: Date) {
  return value.toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getReportRange(
  period: Exclude<ReportPeriod, 'sessions'>,
): ReportRange {
  const now = new Date()

  if (period === 'day') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return { start, end }
  }

  if (period === 'week') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)

    const day = start.getDay()
    start.setDate(start.getDate() - day)

    const end = new Date(start)
    end.setDate(end.getDate() + 7)

    return { start, end }
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    )

    return { start, end }
  }

  const start = new Date(now.getFullYear(), 0, 1)
  const end = new Date(now.getFullYear() + 1, 0, 1)

  return { start, end }
}

function overlapsRange(
  startedAt: string,
  endedAt: string | undefined,
  range: ReportRange,
) {
  const start = new Date(startedAt).getTime()
  const end = endedAt ? new Date(endedAt).getTime() : Date.now()

  return start < range.end.getTime() && end > range.start.getTime()
}

function getOverlapMinutes(
  startedAt: string,
  endedAt: string | undefined,
  range: ReportRange,
) {
  const sessionStart = new Date(startedAt).getTime()
  const sessionEnd = endedAt
    ? new Date(endedAt).getTime()
    : Date.now()

  const overlapStart = Math.max(
    sessionStart,
    range.start.getTime(),
  )

  const overlapEnd = Math.min(
    sessionEnd,
    range.end.getTime(),
  )

  if (overlapEnd <= overlapStart) return 0

  return (overlapEnd - overlapStart) / 60000
}

function isTransactionInRange(
  createdAt: string,
  range: ReportRange,
) {
  const timestamp = new Date(createdAt).getTime()

  return (
    timestamp >= range.start.getTime() &&
    timestamp < range.end.getTime()
  )
}

function isFuelExpense(expense: ExpenseEntry) {
  return expense.category.trim().toLowerCase() === 'fuel'
}

function getSessionIncome(
  sessionId: string,
  income: IncomeEntry[],
) {
  return income
    .filter((entry) => entry.sessionId === sessionId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    )
}

function getSessionExpenses(
  sessionId: string,
  expenses: ExpenseEntry[],
) {
  return expenses
    .filter((entry) => entry.sessionId === sessionId)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime(),
    )
}

function calculatePeriodTotals(
  sessions: Session[],
  income: IncomeEntry[],
  expenses: ExpenseEntry[],
  range: ReportRange,
) {
  const overlappingSessions = sessions.filter((session) =>
    overlapsRange(session.startedAt, session.endedAt, range),
  )

  const sessionIds = new Set(
    overlappingSessions.map((session) => session.id),
  )

  const received = income
    .filter(
      (entry) =>
        sessionIds.has(entry.sessionId) &&
        isTransactionInRange(entry.createdAt, range),
    )
    .reduce((total, entry) => total + entry.amount, 0)

  const expenseTotal = expenses
    .filter(
      (entry) =>
        sessionIds.has(entry.sessionId) &&
        isTransactionInRange(entry.createdAt, range),
    )
    .reduce((total, entry) => total + entry.amount, 0)

  const fuel = expenses
    .filter(
      (entry) =>
        sessionIds.has(entry.sessionId) &&
        isTransactionInRange(entry.createdAt, range) &&
        isFuelExpense(entry),
    )
    .reduce((total, entry) => total + entry.amount, 0)

  const workedMinutes = overlappingSessions.reduce(
    (total, session) =>
      total +
      getOverlapMinutes(
        session.startedAt,
        session.endedAt,
        range,
      ),
    0,
  )

  return {
    received,
    expenses: expenseTotal,
    made: received - expenseTotal,
    workedMinutes,
    fuel,
    sessionCount: overlappingSessions.length,
  }
}

function ReportTabs({
  period,
  onChange,
}: {
  period: ReportPeriod
  onChange: (period: ReportPeriod) => void
}) {
  const periods: ReportPeriod[] = [
    'sessions',
    'day',
    'week',
    'month',
    'year',
  ]

  return (
    <div className="grid grid-cols-5 rounded-xl border bg-background p-1">
      {periods.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-lg px-2 py-2.5 text-xs font-medium capitalize transition-colors ${
            period === value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {value === 'sessions' ? 'Sessions' : value}
        </button>
      ))}
    </div>
  )
}

function SummaryCards({
  received,
  expenses,
  made,
  fuel,
  workedMinutes,
  sessionCount,
}: {
  received: number
  expenses: number
  made: number
  fuel: number
  workedMinutes?: number
  sessionCount: number
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border bg-background p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingUp className="size-4" />
          <p className="text-xs font-medium uppercase tracking-wide">
            Received
          </p>
        </div>

        <p className="mt-2 text-2xl font-bold">
          UGX {formatMoney(received)}
        </p>
      </div>

      <div className="rounded-2xl border bg-background p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <TrendingDown className="size-4" />
          <p className="text-xs font-medium uppercase tracking-wide">
            Expenses
          </p>
        </div>

        <p className="mt-2 text-2xl font-bold">
          UGX {formatMoney(expenses)}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          Fuel: UGX {formatMoney(fuel)}
        </p>
      </div>

      <div className="rounded-2xl border bg-background p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="size-4" />
          <p className="text-xs font-medium uppercase tracking-wide">
            Made
          </p>
        </div>

        <p className="mt-2 text-2xl font-bold">
          UGX {formatMoney(made)}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {sessionCount}{' '}
          {sessionCount === 1 ? 'session' : 'sessions'}
          {workedMinutes !== undefined
            ? ` · ${formatDurationMinutes(workedMinutes)} worked`
            : ''}
        </p>
      </div>
    </div>
  )
}

function SessionOverview({
  session,
  received,
  expenses,
  made,
  fuel,
}: {
  session: Session
  received: number
  expenses: number
  made: number
  fuel: number
}) {
  return (
    <section className="rounded-2xl border bg-background">
      <div className="border-b px-4 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Working session
            </p>

            <h2 className="mt-1 text-xl font-bold">
              {formatDate(session.startedAt)}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                {formatTime(session.startedAt)} –{' '}
                {session.endedAt
                  ? formatTime(session.endedAt)
                  : 'Running'}
              </span>

              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3.5" />
                {formatDuration(
                  session.startedAt,
                  session.endedAt,
                )}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-muted px-3 py-2 text-right">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Made
            </p>

            <p className="text-lg font-bold">
              UGX {formatMoney(made)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            Received
          </p>
          <p className="mt-1 font-bold">
            UGX {formatMoney(received)}
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            Expenses
          </p>
          <p className="mt-1 font-bold">
            UGX {formatMoney(expenses)}
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            Fuel
          </p>
          <p className="mt-1 font-bold">
            UGX {formatMoney(fuel)}
          </p>
        </div>

        <div className="p-4">
          <p className="text-xs text-muted-foreground">
            Net made
          </p>
          <p className="mt-1 font-bold">
            UGX {formatMoney(made)}
          </p>
        </div>
      </div>
    </section>
  )
}

function FuelPerformance({
  session,
  income,
  expenses,
}: {
  session: Session
  income: IncomeEntry[]
  expenses: ExpenseEntry[]
}) {
  const sessionIncome = getSessionIncome(session.id, income)

  const fuelEntries = getSessionExpenses(
    session.id,
    expenses,
  ).filter(isFuelExpense)

  if (fuelEntries.length === 0) {
    return (
      <section className="rounded-2xl border bg-background">
        <div className="flex items-center gap-3 border-b px-4 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
            <Fuel className="size-5" />
          </div>

          <div>
            <h3 className="font-semibold">
              Fuel performance
            </h3>

            <p className="text-xs text-muted-foreground">
              No fuel purchases were recorded in this session.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const firstFuelTime = new Date(
    fuelEntries[0].createdAt,
  ).getTime()

  const beforeFirstFuel = sessionIncome
    .filter(
      (entry) =>
        new Date(entry.createdAt).getTime() < firstFuelTime,
    )
    .reduce((total, entry) => total + entry.amount, 0)

  return (
    <section className="rounded-2xl border bg-background">
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Fuel className="size-5" />
        </div>

        <div>
          <h3 className="font-semibold">
            Fuel performance
          </h3>

          <p className="text-xs text-muted-foreground">
            Each fuel purchase starts a new earning period.
          </p>
        </div>
      </div>

      <div className="p-4">
        {beforeFirstFuel > 0 && (
          <div className="mb-4 rounded-xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">
                  Before first fuel purchase
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Money received before fuel was bought.
                </p>
              </div>

              <p className="font-bold">
                UGX {formatMoney(beforeFirstFuel)}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {fuelEntries.map((fuel, index) => {
            const fuelTime = new Date(
              fuel.createdAt,
            ).getTime()

            const nextFuel = fuelEntries[index + 1]

            const periodEnd = nextFuel
              ? new Date(nextFuel.createdAt).getTime()
              : session.endedAt
                ? new Date(session.endedAt).getTime()
                : Date.now()

            const receivedAfterFuel = sessionIncome
              .filter((entry) => {
                const incomeTime = new Date(
                  entry.createdAt,
                ).getTime()

                return (
                  incomeTime >= fuelTime &&
                  incomeTime < periodEnd
                )
              })
              .reduce(
                (total, entry) => total + entry.amount,
                0,
              )

            const actuallyMade =
              receivedAfterFuel - fuel.amount

            return (
              <div
                key={fuel.id}
                className="rounded-xl border p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      Fuel purchase {index + 1}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(fuel.createdAt)}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Fuel bought
                    </p>

                    <p className="font-bold">
                      UGX {formatMoney(fuel.amount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">
                      Received after fuel
                    </span>

                    <span className="font-semibold">
                      UGX {formatMoney(receivedAfterFuel)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/50 px-3 py-2.5">
                    <span className="text-sm text-muted-foreground">
                      Fuel cost
                    </span>

                    <span className="font-semibold">
                      − UGX {formatMoney(fuel.amount)}
                    </span>
                  </div>

                  <div className="mt-2 rounded-xl border-2 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actually made
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      UGX {formatMoney(actuallyMade)}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Received after this fuel purchase minus
                      this fuel cost.
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  {nextFuel
                    ? `This period ends at the next fuel purchase (${formatTime(
                        nextFuel.createdAt,
                      )}).`
                    : 'This period continues until the session ended.'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ExpenseBreakdown({
  expenses,
}: {
  expenses: ExpenseEntry[]
}) {
  const grouped = new Map<string, number>()

  for (const expense of expenses) {
    grouped.set(
      expense.category,
      (grouped.get(expense.category) ?? 0) +
        expense.amount,
    )
  }

  const rows = [...grouped.entries()].sort(
    (a, b) => b[1] - a[1],
  )

  return (
    <section className="rounded-2xl border bg-background">
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <ReceiptText className="size-5" />
        </div>

        <div>
          <h3 className="font-semibold">
            Expense breakdown
          </h3>

          <p className="text-xs text-muted-foreground">
            Every expense category in this session.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            No expenses recorded.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {rows.map(([category, amount]) => (
            <div
              key={category}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {isFuelExpense({
                  id: '',
                  sessionId: '',
                  category,
                  amount: 0,
                  createdAt: '',
                }) ? (
                  <Fuel className="size-4 text-muted-foreground" />
                ) : (
                  <ReceiptText className="size-4 text-muted-foreground" />
                )}

                <span className="text-sm font-medium">
                  {category}
                </span>
              </div>

              <span className="font-semibold">
                UGX {formatMoney(amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ActivityTimeline({
  income,
  expenses,
}: {
  income: IncomeEntry[]
  expenses: ExpenseEntry[]
}) {
  const activities = useMemo<Activity[]>(() => {
    const incomeActivities: Activity[] = income.map(
      (entry) => ({
        type: 'income',
        id: entry.id,
        createdAt: entry.createdAt,
        amount: entry.amount,
      }),
    )

    const expenseActivities: Activity[] = expenses.map(
      (entry) => ({
        type: 'expense',
        id: entry.id,
        createdAt: entry.createdAt,
        amount: entry.amount,
        category: entry.category,
      }),
    )

    return [...incomeActivities, ...expenseActivities].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )
  }, [income, expenses])

  return (
    <section className="rounded-2xl border bg-background">
      <div className="flex items-center gap-3 border-b px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <Clock3 className="size-5" />
        </div>

        <div>
          <h3 className="font-semibold">
            Activity timeline
          </h3>

          <p className="text-xs text-muted-foreground">
            Everything that was recorded during the session.
          </p>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            No transactions were recorded.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {activities.map((activity) => (
            <div
              key={`${activity.type}-${activity.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  {activity.type === 'income' ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="font-medium">
                    {activity.type === 'income'
                      ? 'Money received'
                      : activity.category}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {formatTime(activity.createdAt)}
                  </p>
                </div>
              </div>

              <p
                className={`shrink-0 font-semibold ${
                  activity.type === 'income'
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {activity.type === 'income' ? '+' : '−'} UGX{' '}
                {formatMoney(activity.amount)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SessionDetails({
  session,
  income,
  expenses,
  onBack,
}: {
  session: Session
  income: IncomeEntry[]
  expenses: ExpenseEntry[]
  onBack: () => void
}) {
  const sessionIncome = getSessionIncome(
    session.id,
    income,
  )

  const sessionExpenses = getSessionExpenses(
    session.id,
    expenses,
  )

  const received = sessionIncome.reduce(
    (total, entry) => total + entry.amount,
    0,
  )

  const expenseTotal = sessionExpenses.reduce(
    (total, entry) => total + entry.amount,
    0,
  )

  const fuelTotal = sessionExpenses
    .filter(isFuelExpense)
    .reduce((total, entry) => total + entry.amount, 0)

  const made = received - expenseTotal

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-28">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to reports
      </button>

      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Session report
        </p>

        <h1 className="mt-1 text-2xl font-bold">
          {formatDate(session.startedAt)}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Complete financial report for this working period.
        </p>
      </div>

      <div className="space-y-4">
        <SessionOverview
          session={session}
          received={received}
          expenses={expenseTotal}
          made={made}
          fuel={fuelTotal}
        />

        <FuelPerformance
          session={session}
          income={income}
          expenses={expenses}
        />

        <ExpenseBreakdown expenses={sessionExpenses} />

        <ActivityTimeline
          income={sessionIncome}
          expenses={sessionExpenses}
        />
      </div>
    </main>
  )
}

function SessionsList({
  sessions,
  income,
  expenses,
  onSelect,
}: {
  sessions: Session[]
  income: IncomeEntry[]
  expenses: ExpenseEntry[]
  onSelect: (sessionId: string) => void
}) {
  const sortedSessions = [...sessions].sort(
    (a, b) =>
      new Date(b.startedAt).getTime() -
      new Date(a.startedAt).getTime(),
  )

  if (sortedSessions.length === 0) {
    return (
      <div className="rounded-2xl border bg-background p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted">
          <Clock3 className="size-6" />
        </div>

        <p className="mt-4 font-semibold">
          No completed sessions yet
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Start working and complete a session to see its full
          report here.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border bg-background">
      <div className="border-b px-4 py-4">
        <h2 className="font-semibold">
          Completed sessions
        </h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Your actual working periods. Tap any session for its
          complete report.
        </p>
      </div>

      <div className="divide-y">
        {sortedSessions.map((session) => {
          const sessionIncome = getSessionIncome(
            session.id,
            income,
          )

          const sessionExpenses = getSessionExpenses(
            session.id,
            expenses,
          )

          const received = sessionIncome.reduce(
            (total, entry) => total + entry.amount,
            0,
          )

          const expenseTotal = sessionExpenses.reduce(
            (total, entry) => total + entry.amount,
            0,
          )

          const made = received - expenseTotal

          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onSelect(session.id)}
              className="group flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0">
                <p className="font-semibold">
                  {formatShortDate(session.startedAt)}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    {formatTime(session.startedAt)} –{' '}
                    {session.endedAt
                      ? formatTime(session.endedAt)
                      : 'Running'}
                  </span>

                  <span>
                    {formatDuration(
                      session.startedAt,
                      session.endedAt,
                    )}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="text-sm font-semibold">
                    UGX {formatMoney(made)} made
                  </span>

                  <span className="text-sm text-muted-foreground">
                    UGX {formatMoney(received)} received
                  </span>
                </div>
              </div>

              <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function PeriodSessions({
  period,
  sessions,
  income,
  expenses,
}: {
  period: Exclude<ReportPeriod, 'sessions'>
  sessions: Session[]
  income: IncomeEntry[]
  expenses: ExpenseEntry[]
}) {
  const range = getReportRange(period)

  const overlapping = sessions
    .filter((session) =>
      overlapsRange(session.startedAt, session.endedAt, range),
    )
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() -
        new Date(a.startedAt).getTime(),
    )

  if (overlapping.length === 0) {
    return (
      <div className="rounded-2xl border bg-background p-8 text-center">
        <CalendarDays className="mx-auto size-8 text-muted-foreground" />

        <p className="mt-3 font-semibold">
          No work in this period
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          There are no sessions overlapping this period.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border bg-background">
      <div className="border-b px-4 py-4">
        <h2 className="font-semibold">
          Sessions in this period
        </h2>

        <p className="mt-1 text-xs text-muted-foreground">
          Sessions can cross midnight. Transactions belong to
          the period in which they actually happened.
        </p>
      </div>

      <div className="divide-y">
        {overlapping.map((session) => {
          const periodIncome = income.filter(
            (entry) =>
              entry.sessionId === session.id &&
              isTransactionInRange(entry.createdAt, range),
          )

          const periodExpenses = expenses.filter(
            (entry) =>
              entry.sessionId === session.id &&
              isTransactionInRange(entry.createdAt, range),
          )

          const received = periodIncome.reduce(
            (total, entry) => total + entry.amount,
            0,
          )

          const expenseTotal = periodExpenses.reduce(
            (total, entry) => total + entry.amount,
            0,
          )

          const workedMinutes = getOverlapMinutes(
            session.startedAt,
            session.endedAt,
            range,
          )

          return (
            <div
              key={session.id}
              className="px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">
                    {formatShortDate(session.startedAt)}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatTime(session.startedAt)} –{' '}
                    {session.endedAt
                      ? formatTime(session.endedAt)
                      : 'Running'}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold">
                    UGX {formatMoney(received - expenseTotal)}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    made
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">
                    Received
                  </p>

                  <p className="mt-1 font-semibold">
                    UGX {formatMoney(received)}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">
                    Expenses
                  </p>

                  <p className="mt-1 font-semibold">
                    UGX {formatMoney(expenseTotal)}
                  </p>
                </div>

                <div className="rounded-lg bg-muted/60 p-3">
                  <p className="text-muted-foreground">
                    Worked
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatDurationMinutes(workedMinutes)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function ReportsScreen() {
  const {
    activeSession,
    completedSessions,
    income,
    expenses,
  } = useApp()

  const [period, setPeriod] =
    useState<ReportPeriod>('sessions')

  const [selectedSessionId, setSelectedSessionId] =
    useState<string | null>(null)

  const allSessions = useMemo(() => {
    const sessions = [...completedSessions]

    if (activeSession) {
      sessions.push(activeSession)
    }

    return sessions
  }, [activeSession, completedSessions])

  const selectedSession = allSessions.find(
    (session) => session.id === selectedSessionId,
  )

  if (selectedSession) {
    return (
      <SessionDetails
        session={selectedSession}
        income={income}
        expenses={expenses}
        onBack={() => setSelectedSessionId(null)}
      />
    )
  }

  if (period === 'sessions') {
    const received = income.reduce(
      (total, entry) => total + entry.amount,
      0,
    )

    const expenseTotal = expenses.reduce(
      (total, entry) => total + entry.amount,
      0,
    )

    const fuel = expenses
      .filter(isFuelExpense)
      .reduce((total, entry) => total + entry.amount, 0)

    return (
      <main className="mx-auto max-w-5xl px-4 py-6 pb-28">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Performance
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Reports
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            See what your work has produced.
          </p>
        </div>

        <div className="space-y-5">
          <ReportTabs
            period={period}
            onChange={setPeriod}
          />

          <SummaryCards
            received={received}
            expenses={expenseTotal}
            made={received - expenseTotal}
            fuel={fuel}
            sessionCount={completedSessions.length}
          />

          <SessionsList
            sessions={completedSessions}
            income={income}
            expenses={expenses}
            onSelect={setSelectedSessionId}
          />
        </div>
      </main>
    )
  }

  const range = getReportRange(period)

  const totals = calculatePeriodTotals(
    allSessions,
    income,
    expenses,
    range,
  )

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-28">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Performance
        </p>

        <h1 className="mt-1 text-2xl font-bold">
          Reports
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {period === 'day' && 'Today'}
          {period === 'week' && 'This week'}
          {period === 'month' && 'This month'}
          {period === 'year' && 'This year'}
        </p>
      </div>

      <div className="space-y-5">
        <ReportTabs
          period={period}
          onChange={setPeriod}
        />

        <SummaryCards
          received={totals.received}
          expenses={totals.expenses}
          made={totals.made}
          fuel={totals.fuel}
          workedMinutes={totals.workedMinutes}
          sessionCount={totals.sessionCount}
        />

        <div className="rounded-2xl border bg-background p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
              <CalendarDays className="size-5" />
            </div>

            <div>
              <p className="font-semibold">
                {formatRangeDate(range.start)}
                {' – '}
                {formatRangeDate(
                  new Date(range.end.getTime() - 1),
                )}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Calendar reports use the actual time each
                transaction happened.
              </p>
            </div>
          </div>
        </div>

        <PeriodSessions
          period={period}
          sessions={allSessions}
          income={income}
          expenses={expenses}
        />
      </div>
    </main>
  )
}
