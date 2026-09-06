import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApp } from '@/app/providers'
import { formatMoney } from '@/features/boda/bodaQuickAmounts'
import type { ExpenseEntry, IncomeEntry, Session } from '@/types/app'

type ReportPeriod = 'sessions' | 'day' | 'week' | 'month' | 'year'

interface ReportRange {
  start: Date
  end: Date
  label: string
}

function startOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function endOfDay(date: Date) {
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

function startOfWeek(date: Date) {
  const result = startOfDay(date)
  result.setDate(result.getDate() - result.getDay())
  return result
}

function endOfWeek(date: Date) {
  const result = startOfWeek(date)
  result.setDate(result.getDate() + 6)
  return endOfDay(result)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  )
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1)
}

function endOfYear(date: Date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999)
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-UG', {
    day: 'numeric',
    month: 'short',
  })
}

function formatMonth(date: Date) {
  return date.toLocaleDateString('en-UG', {
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-UG', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(minutes: number) {
  if (minutes < 1) return '0m'

  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60

  if (hours === 0) return `${remaining}m`
  if (remaining === 0) return `${hours}h`

  return `${hours}h ${remaining}m`
}

function getReportRange(
  period: Exclude<ReportPeriod, 'sessions'>,
  anchor: Date,
): ReportRange {
  if (period === 'day') {
    return {
      start: startOfDay(anchor),
      end: endOfDay(anchor),
      label: formatDate(anchor),
    }
  }

  if (period === 'week') {
    const start = startOfWeek(anchor)
    const end = endOfWeek(anchor)

    return {
      start,
      end,
      label: `${formatShortDate(start)} – ${formatShortDate(end)} ${end.getFullYear()}`,
    }
  }

  if (period === 'month') {
    return {
      start: startOfMonth(anchor),
      end: endOfMonth(anchor),
      label: formatMonth(anchor),
    }
  }

  return {
    start: startOfYear(anchor),
    end: endOfYear(anchor),
    label: anchor.getFullYear().toString(),
  }
}

function shiftAnchor(
  period: Exclude<ReportPeriod, 'sessions'>,
  anchor: Date,
  direction: -1 | 1,
) {
  const next = new Date(anchor)

  if (period === 'day') {
    next.setDate(next.getDate() + direction)
  } else if (period === 'week') {
    next.setDate(next.getDate() + direction * 7)
  } else if (period === 'month') {
    next.setMonth(next.getMonth() + direction)
  } else {
    next.setFullYear(next.getFullYear() + direction)
  }

  return next
}

function isInsideRange(value: string, range: ReportRange) {
  const date = new Date(value)
  return date >= range.start && date <= range.end
}

function overlapsRange(session: Session, range: ReportRange) {
  const start = new Date(session.startedAt)
  const end = session.endedAt ? new Date(session.endedAt) : new Date()

  return start <= range.end && end >= range.start
}

function getOverlapMinutes(session: Session, range: ReportRange) {
  const sessionStart = new Date(session.startedAt)
  const sessionEnd = session.endedAt ? new Date(session.endedAt) : new Date()

  const start = Math.max(sessionStart.getTime(), range.start.getTime())
  const end = Math.min(sessionEnd.getTime(), range.end.getTime())

  if (end <= start) return 0

  return Math.round((end - start) / 60000)
}

function getSessionIncome(
  sessionId: string,
  income: IncomeEntry[],
  range?: ReportRange,
) {
  return income.filter(
    entry =>
      entry.sessionId === sessionId &&
      (!range || isInsideRange(entry.createdAt, range)),
  )
}

function getSessionExpenses(
  sessionId: string,
  expenses: ExpenseEntry[],
  range?: ReportRange,
) {
  return expenses.filter(
    entry =>
      entry.sessionId === sessionId &&
      (!range || isInsideRange(entry.createdAt, range)),
  )
}

function calculatePeriodTotals(
  sessions: Session[],
  income: IncomeEntry[],
  expenses: ExpenseEntry[],
  range: ReportRange,
) {
  const overlappingSessions = sessions.filter(session =>
    overlapsRange(session, range),
  )

  const periodIncome = income.filter(entry =>
    isInsideRange(entry.createdAt, range),
  )

  const periodExpenses = expenses.filter(entry =>
    isInsideRange(entry.createdAt, range),
  )

  const received = periodIncome.reduce(
    (total, entry) => total + entry.amount,
    0,
  )

  const totalExpenses = periodExpenses.reduce(
    (total, entry) => total + entry.amount,
    0,
  )

  const fuel = periodExpenses
    .filter(entry => entry.category.trim().toLowerCase() === 'fuel')
    .reduce((total, entry) => total + entry.amount, 0)

  const workedMinutes = overlappingSessions.reduce(
    (total, session) => total + getOverlapMinutes(session, range),
    0,
  )

  return {
    sessions: overlappingSessions,
    received,
    expenses: totalExpenses,
    fuel,
    made: received - totalExpenses,
    workedMinutes,
  }
}

function PeriodSelector({
  period,
  anchor,
  onAnchorChange,
}: {
  period: Exclude<ReportPeriod, 'sessions'>
  anchor: Date
  onAnchorChange: (date: Date) => void
}) {
  const range = getReportRange(period, anchor)

  function go(direction: -1 | 1) {
    onAnchorChange(shiftAnchor(period, anchor, direction))
  }

  function goCurrent() {
    onAnchorChange(new Date())
  }

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background transition hover:bg-muted"
          aria-label={`Previous ${period}`}
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="min-w-0 text-center">
          <div className="mb-1 flex items-center justify-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <CalendarDays className="size-4" />
            Selected {period}
          </div>

          <p className="truncate text-base font-semibold">
            {range.label}
          </p>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background transition hover:bg-muted"
          aria-label={`Next ${period}`}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <button
        type="button"
        onClick={goCurrent}
        className="mt-3 w-full rounded-xl border bg-background px-3 py-2 text-sm font-medium transition hover:bg-muted"
      >
        Go to current {period}
      </button>
    </section>
  )
}

function ReportTabs({
  period,
  onChange,
}: {
  period: ReportPeriod
  onChange: (period: ReportPeriod) => void
}) {
  const tabs: { value: ReportPeriod; label: string }[] = [
    { value: 'sessions', label: 'Sessions' },
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ]

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max rounded-xl border bg-muted/40 p-1">
        {tabs.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              period === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function SummaryCards({
  received,
  expenses,
  fuel,
  made,
  workedMinutes,
  sessionCount,
}: {
  received: number
  expenses: number
  fuel: number
  made: number
  workedMinutes: number
  sessionCount: number
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Received</p>
        <p className="mt-2 text-2xl font-bold">
          UGX {formatMoney(received)}
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Expenses</p>
        <p className="mt-2 text-2xl font-bold">
          UGX {formatMoney(expenses)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Fuel: UGX {formatMoney(fuel)}
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Made</p>
        <p className="mt-2 text-2xl font-bold">
          UGX {formatMoney(made)}
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Worked</p>
        <p className="mt-2 text-2xl font-bold">
          {formatDuration(workedMinutes)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
        </p>
      </div>
    </div>
  )
}

function PeriodSessions({
  sessions,
  income,
  expenses,
  range,
  onSelect,
}: {
  sessions: Session[]
  income: IncomeEntry[]
  expenses: ExpenseEntry[]
  range: ReportRange
  onSelect: (id: string) => void
}) {
  const sorted = [...sessions].sort(
    (a, b) =>
      new Date(b.startedAt).getTime() -
      new Date(a.startedAt).getTime(),
  )

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Sessions in this period</h2>
        <p className="text-sm text-muted-foreground">
          Sessions that overlapped the selected calendar period.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center">
          <p className="font-medium">No sessions in this period</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try another day, week, month, or year.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(session => {
            const sessionIncome = getSessionIncome(
              session.id,
              income,
              range,
            )

            const sessionExpenses = getSessionExpenses(
              session.id,
              expenses,
              range,
            )

            const received = sessionIncome.reduce(
              (total, entry) => total + entry.amount,
              0,
            )

            const expenseTotal = sessionExpenses.reduce(
              (total, entry) => total + entry.amount,
              0,
            )

            const worked = getOverlapMinutes(session, range)

            return (
              <button
                key={session.id}
                type="button"
                onClick={() => onSelect(session.id)}
                className="w-full rounded-2xl border bg-card p-4 text-left transition hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {formatDate(new Date(session.startedAt))}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatTime(new Date(session.startedAt))}
                      {' – '}
                      {session.endedAt
                        ? formatTime(new Date(session.endedAt))
                        : 'Running'}
                      {' · '}
                      {formatDuration(worked)} in selected period
                    </p>
                  </div>

                  <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                  <span>
                    Received{' '}
                    <strong>UGX {formatMoney(received)}</strong>
                  </span>

                  <span>
                    Made{' '}
                    <strong>
                      UGX {formatMoney(received - expenseTotal)}
                    </strong>
                  </span>
                </div>
              </button>
            )
          })}
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
  const sessionIncome = getSessionIncome(session.id, income)
  const sessionExpenses = getSessionExpenses(session.id, expenses)

  const received = sessionIncome.reduce(
    (total, entry) => total + entry.amount,
    0,
  )

  const expenseTotal = sessionExpenses.reduce(
    (total, entry) => total + entry.amount,
    0,
  )

  const fuel = sessionExpenses
    .filter(entry => entry.category.trim().toLowerCase() === 'fuel')
    .reduce((total, entry) => total + entry.amount, 0)

  const started = new Date(session.startedAt)
  const ended = session.endedAt ? new Date(session.endedAt) : new Date()

  const duration = Math.max(
    0,
    Math.round((ended.getTime() - started.getTime()) / 60000),
  )

  const activity = [
    ...sessionIncome.map(entry => ({
      id: entry.id,
      createdAt: entry.createdAt,
      label: 'Received',
      amount: entry.amount,
      type: 'income' as const,
    })),
    ...sessionExpenses.map(entry => ({
      id: entry.id,
      createdAt: entry.createdAt,
      label: entry.category,
      amount: entry.amount,
      type: 'expense' as const,
    })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  )

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        ← Back to reports
      </button>

      <div>
        <p className="text-sm text-muted-foreground">Session report</p>
        <h1 className="mt-1 text-2xl font-bold">
          {formatDate(started)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatTime(started)} –{' '}
          {session.endedAt ? formatTime(ended) : 'Running'}
          {' · '}
          {formatDuration(duration)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Received</p>
          <p className="mt-2 text-xl font-bold">
            UGX {formatMoney(received)}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Expenses</p>
          <p className="mt-2 text-xl font-bold">
            UGX {formatMoney(expenseTotal)}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Fuel</p>
          <p className="mt-2 text-xl font-bold">
            UGX {formatMoney(fuel)}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Made</p>
          <p className="mt-2 text-xl font-bold">
            UGX {formatMoney(received - expenseTotal)}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold">Activity</h2>

        {activity.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No transactions recorded in this session.
          </p>
        ) : (
          <div className="mt-3 divide-y">
            {activity.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(new Date(item.createdAt))}
                  </p>
                </div>

                <p
                  className={`font-semibold ${
                    item.type === 'expense'
                      ? 'text-destructive'
                      : 'text-foreground'
                  }`}
                >
                  {item.type === 'expense' ? '-' : '+'}UGX{' '}
                  {formatMoney(item.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export function ReportsScreen() {
  const {
    completedSessions,
    activeSession,
    income,
    expenses,
  } = useApp()

  const [period, setPeriod] = useState<ReportPeriod>('sessions')
  const [anchor, setAnchor] = useState(new Date())
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  )

  const allSessions = useMemo(() => {
    const sessions = [...completedSessions]

    if (
      activeSession &&
      !sessions.some(session => session.id === activeSession.id)
    ) {
      sessions.push(activeSession)
    }

    return sessions
  }, [completedSessions, activeSession])

  const selectedSession = selectedSessionId
    ? allSessions.find(session => session.id === selectedSessionId) ?? null
    : null

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

  const periodRange =
    period === 'sessions'
      ? null
      : getReportRange(period, anchor)

  const totals = periodRange
    ? calculatePeriodTotals(
        allSessions,
        income,
        expenses,
        periodRange,
      )
    : null

  const sessionTotals = allSessions.reduce(
    (result, session) => {
      const sessionIncome = getSessionIncome(session.id, income)
      const sessionExpenses = getSessionExpenses(session.id, expenses)

      result.received += sessionIncome.reduce(
        (total, entry) => total + entry.amount,
        0,
      )

      result.expenses += sessionExpenses.reduce(
        (total, entry) => total + entry.amount,
        0,
      )

      return result
    },
    {
      received: 0,
      expenses: 0,
    },
  )

  const sessionWorkedMinutes = allSessions.reduce(
    (total, session) => {
      const start = new Date(session.startedAt)
      const end = session.endedAt
        ? new Date(session.endedAt)
        : new Date()

      return (
        total +
        Math.max(
          0,
          Math.round((end.getTime() - start.getTime()) / 60000),
        )
      )
    },
    0,
  )

  const sessionFuel = allSessions
    .flatMap(session => getSessionExpenses(session.id, expenses))
    .filter(
      expense =>
        expense.category.trim().toLowerCase() === 'fuel',
    )
    .reduce((total, expense) => total + expense.amount, 0)

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          PERFORMANCE
        </p>
        <h1 className="mt-1 text-2xl font-bold">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See what your work has produced.
        </p>
      </div>

      <ReportTabs
        period={period}
        onChange={nextPeriod => {
          setPeriod(nextPeriod)
          setSelectedSessionId(null)
        }}
      />

      {period === 'sessions' ? (
        <>
          <SummaryCards
            received={sessionTotals.received}
            expenses={sessionTotals.expenses}
            fuel={sessionFuel}
            made={sessionTotals.received - sessionTotals.expenses}
            workedMinutes={sessionWorkedMinutes}
            sessionCount={allSessions.length}
          />

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">
                Completed sessions
              </h2>
              <p className="text-sm text-muted-foreground">
                Your actual working periods.
              </p>
            </div>

            {allSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center">
                <p className="font-medium">No sessions yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start working and your completed sessions will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...allSessions]
                  .sort(
                    (a, b) =>
                      new Date(b.startedAt).getTime() -
                      new Date(a.startedAt).getTime(),
                  )
                  .map(session => {
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

                    const started = new Date(session.startedAt)
                    const ended = session.endedAt
                      ? new Date(session.endedAt)
                      : new Date()

                    const minutes = Math.max(
                      0,
                      Math.round(
                        (ended.getTime() - started.getTime()) / 60000,
                      ),
                    )

                    return (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => setSelectedSessionId(session.id)}
                        className="w-full rounded-2xl border bg-card p-4 text-left transition hover:bg-muted/40"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">
                              {formatDate(started)}
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                              {formatTime(started)} –{' '}
                              {session.endedAt
                                ? formatTime(ended)
                                : 'Running'}
                              {' · '}
                              {formatDuration(minutes)}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-4 text-sm">
                              <span>
                                UGX {formatMoney(received)} received
                              </span>

                              <span>
                                UGX{' '}
                                {formatMoney(received - expenseTotal)} made
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" />
                        </div>
                      </button>
                    )
                  })}
              </div>
            )}
          </section>
        </>
      ) : periodRange && totals ? (
        <>
          <PeriodSelector
            period={period}
            anchor={anchor}
            onAnchorChange={setAnchor}
          />

          <div>
            <p className="text-sm text-muted-foreground">
              Report for
            </p>
            <h2 className="mt-1 text-xl font-bold">
              {periodRange.label}
            </h2>
          </div>

          <SummaryCards
            received={totals.received}
            expenses={totals.expenses}
            fuel={totals.fuel}
            made={totals.made}
            workedMinutes={totals.workedMinutes}
            sessionCount={totals.sessions.length}
          />

          <PeriodSessions
            sessions={totals.sessions}
            income={income}
            expenses={expenses}
            range={periodRange}
            onSelect={setSelectedSessionId}
          />
        </>
      ) : null}
    </div>
  )
}
