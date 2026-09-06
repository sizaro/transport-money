import { useEffect, useMemo, useState } from 'react'
import {
  Bike,
  Check,
  CircleAlert,
  Clock3,
  Play,
  RotateCcw,
  Square,
  Undo2,
} from 'lucide-react'

import { useApp } from '@/app/providers'
import { Button } from '@/components/ui/button'
import {
  BODA_QUICK_AMOUNTS,
  formatMoney,
  formatQuickAmount,
} from './bodaQuickAmounts'

function formatDuration(startedAt: string, now: number) {
  const elapsed = Math.max(0, now - new Date(startedAt).getTime())
  const totalMinutes = Math.floor(elapsed / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('en-UG', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function BodaWorkingScreen() {
  const {
    onboarding,
    activeSession,
    income,
    startSession,
    endSession,
    addIncome,
    undoIncome,
  } = useApp()

  const [now, setNow] = useState(Date.now())
  const [lastAdded, setLastAdded] = useState<number | null>(null)

  useEffect(() => {
    if (!activeSession) return

    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 30000)

    return () => window.clearInterval(timer)
  }, [activeSession])

  const sessionDuration = useMemo(() => {
    if (!activeSession) return '0h 00m'
    return formatDuration(activeSession.startedAt, now)
  }, [activeSession, now])

  const recentIncome = income.slice(-2).reverse()

  function handleAmount(amount: number) {
    if (amount <= 0) return

    addIncome(amount)
    setLastAdded(amount)

    window.setTimeout(() => {
      setLastAdded((current) => (current === amount ? null : current))
    }, 1800)
  }

  function handleOther() {
    const value = window.prompt('Enter amount received')

    if (value === null) return

    const cleaned = value.replace(/,/g, '').trim()
    const amount = Number(cleaned)

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amount)) {
      window.alert('Enter a valid whole amount.')
      return
    }

    handleAmount(amount)
  }

  function handleUndo() {
    if (income.length === 0) return

    const last = income[income.length - 1]

    const confirmed = window.confirm(
      `Undo ${formatMoney(last.amount)}?\nRecorded at ${formatTime(last.createdAt)}.`
    )

    if (!confirmed) return

    undoIncome()
    setLastAdded(null)
  }

  function handleEndSession() {
    if (!activeSession) return

    const confirmed = window.confirm(
      `End this session?\n\nRunning: ${sessionDuration}\nReceived: ${formatMoney(activeSession.received)}`
    )

    if (confirmed) {
      endSession()
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-7">
      {!activeSession ? (
        <InactiveSession
          name={onboarding?.name}
          onStart={startSession}
        />
      ) : (
        <ActiveSession
          duration={sessionDuration}
          received={activeSession.received}
          recentIncome={recentIncome}
          lastAdded={lastAdded}
          onAmount={handleAmount}
          onOther={handleOther}
          onUndo={handleUndo}
          onEnd={handleEndSession}
        />
      )}
    </main>
  )
}

function InactiveSession({
  name,
  onStart,
}: {
  name?: string
  onStart: () => void
}) {
  return (
    <section className="mx-auto max-w-2xl">
      <div className="space-y-7">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
            BODA BODA
          </p>

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome{name ? `, ${name}` : ''}
          </h1>

          <p className="text-muted-foreground">
            Ready to start working?
          </p>
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted">
              <Bike className="size-6" />
            </div>

            <div className="space-y-1">
              <p className="font-semibold">No active session</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Start a session when you begin working. Your earnings will be
                counted from that moment.
              </p>
            </div>
          </div>

          <Button
            className="mt-7 h-14 w-full rounded-2xl text-base font-semibold"
            size="lg"
            onClick={onStart}
          >
            <Play className="size-5" />
            START SESSION
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You can end the session whenever you stop working.
        </p>
      </div>
    </section>
  )
}

function ActiveSession({
  duration,
  received,
  recentIncome,
  lastAdded,
  onAmount,
  onOther,
  onUndo,
  onEnd,
}: {
  duration: string
  received: number
  recentIncome: {
    id: string
    amount: number
    createdAt: string
  }[]
  lastAdded: number | null
  onAmount: (amount: number) => void
  onOther: () => void
  onUndo: () => void
  onEnd: () => void
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-3xl border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-500 opacity-50" />
              <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
            </span>

            <span className="text-xs font-bold tracking-[0.14em]">
              SESSION RUNNING
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock3 className="size-4" />
            {duration}
          </div>
        </div>

        <div className="px-5 py-6 text-center sm:px-7 sm:py-8">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
            RECEIVED THIS SESSION
          </p>

          <p className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            {formatMoney(received)}
          </p>

          {lastAdded !== null ? (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium">
              <Check className="size-4" />
              {formatMoney(lastAdded)} received
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Tap an amount below when a passenger pays.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold">Passenger payment</p>
          <p className="text-xs text-muted-foreground">
            Tap the amount received
          </p>
        </div>

        <button
          type="button"
          onClick={onUndo}
          disabled={recentIncome.length === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <Undo2 className="size-4" />
          Undo last
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
        {BODA_QUICK_AMOUNTS.map((amount) => (
          <button
            key={amount}
            type="button"
            onClick={() => onAmount(amount)}
            className="flex min-h-14 items-center justify-center rounded-xl border bg-card text-base font-bold shadow-sm transition hover:bg-muted active:scale-[0.97] sm:min-h-16 sm:text-lg"
          >
            {formatQuickAmount(amount)}
          </button>
        ))}

        <button
          type="button"
          onClick={onOther}
          className="flex min-h-14 items-center justify-center gap-1.5 rounded-xl border border-dashed bg-card text-sm font-semibold text-muted-foreground transition hover:bg-muted active:scale-[0.97] sm:min-h-16"
        >
          <CircleAlert className="size-4" />
          Other
        </button>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Recent payments</p>
          <p className="text-xs text-muted-foreground">
            {recentIncome.length} shown
          </p>
        </div>

        {recentIncome.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No payments recorded yet.
          </div>
        ) : (
          <div className="divide-y">
            {recentIncome.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
                    <Check className="size-4" />
                  </div>

                  <span className="text-sm text-muted-foreground">
                    {formatTime(entry.createdAt)}
                  </span>
                </div>

                <span className="font-semibold">
                  +{formatMoney(entry.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        variant="outline"
        className="h-12 w-full rounded-2xl"
        onClick={onEnd}
      >
        <Square className="size-4" />
        END SESSION
      </Button>

      <div className="flex items-center justify-center gap-2 pt-1 text-xs text-muted-foreground">
        <RotateCcw className="size-3.5" />
        <span>Your entries are saved immediately on this device.</span>
      </div>
    </section>
  )
}
