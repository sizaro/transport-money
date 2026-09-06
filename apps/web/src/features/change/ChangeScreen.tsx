import { useState } from 'react'
import {
  ArrowLeftRight,
  CircleAlert,
  Check,
  RotateCcw,
} from 'lucide-react'

import { useApp } from '@/app/providers'
import { Button } from '@/components/ui/button'
import {
  CHANGE_FARE_AMOUNTS,
  CHANGE_GIVEN_AMOUNTS,
  formatChangeMoney,
  formatChangeQuickAmount,
} from '@/features/change/changeConfig'

type Step = 'fare' | 'given' | 'result'

export function ChangeScreen() {
  const {
    activeSession,
    addChange,
  } = useApp()

  const [step, setStep] = useState<Step>('fare')
  const [fare, setFare] = useState<number | null>(null)
  const [amountGiven, setAmountGiven] = useState<number | null>(null)

  function reset() {
    setStep('fare')
    setFare(null)
    setAmountGiven(null)
  }

  function selectFare(amount: number) {
    setFare(amount)
    setAmountGiven(null)
    setStep('given')
  }

  function selectGiven(amount: number) {
    if (!fare) return

    if (amount < fare) {
      window.alert(
        `Customer gave UGX ${formatChangeMoney(amount)}. Fare is UGX ${formatChangeMoney(fare)}.`,
      )
      return
    }

    setAmountGiven(amount)
    setStep('result')
  }

  function handleOtherFare() {
    const value = window.prompt('Enter fare amount')

    if (value === null) return

    const amount = Number(
      value.replace(/,/g, '').trim(),
    )

    if (!Number.isInteger(amount) || amount <= 0) {
      window.alert('Enter a valid whole-number fare.')
      return
    }

    selectFare(amount)
  }

  function handleOtherGiven() {
    const value = window.prompt('Enter amount customer gave')

    if (value === null) return

    const amount = Number(
      value.replace(/,/g, '').trim(),
    )

    if (!Number.isInteger(amount) || amount <= 0) {
      window.alert('Enter a valid whole-number amount.')
      return
    }

    selectGiven(amount)
  }

  function completeChange() {
    if (
      fare === null ||
      amountGiven === null ||
      amountGiven < fare
    ) {
      return
    }

    addChange(fare, amountGiven)
    setStep('fare')
    setFare(null)
    setAmountGiven(null)
  }

  if (!activeSession) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-6 text-center shadow-sm">
          <ArrowLeftRight className="mx-auto size-8 text-muted-foreground" />

          <h1 className="mt-4 text-xl font-semibold">
            No active session
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Start a working session before using Change.
          </p>
        </div>
      </main>
    )
  }

  const change =
    fare !== null && amountGiven !== null
      ? amountGiven - fare
      : 0

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
      <section className="mx-auto max-w-2xl space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
            CUSTOMER CHANGE
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Change
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Work out change and record the fare received.
          </p>
        </div>

        {step === 'fare' && (
          <div className="space-y-4">
            <div>
              <h2 className="font-semibold">
                What is the fare?
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Choose the fare you charged.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CHANGE_FARE_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={() => selectFare(amount)}
                >
                  {formatChangeQuickAmount(amount)}
                </Button>
              ))}

              <Button
                type="button"
                variant="secondary"
                className="h-12"
                onClick={handleOtherFare}
              >
                Other
              </Button>
            </div>
          </div>
        )}

        {step === 'given' && fare !== null && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-muted-foreground">
                FARE
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatChangeMoney(fare)}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                UGX
              </p>
            </div>

            <div>
              <h2 className="font-semibold">
                How much did the customer give?
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Choose the amount received from the customer.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {CHANGE_GIVEN_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={() => selectGiven(amount)}
                >
                  {formatChangeQuickAmount(amount)}
                </Button>
              ))}

              <Button
                type="button"
                variant="secondary"
                className="h-12"
                onClick={handleOtherGiven}
              >
                Other
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep('fare')}
            >
              <RotateCcw />
              Change fare
            </Button>
          </div>
        )}

        {step === 'result' &&
          fare !== null &&
          amountGiven !== null && (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
                <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                  GIVE BACK
                </p>

                <p className="mt-3 text-5xl font-bold tracking-tight">
                  {formatChangeMoney(change)}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                  UGX
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 border-t pt-5 text-left">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Fare
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatChangeMoney(fare)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Customer gave
                    </p>

                    <p className="mt-1 font-semibold">
                      {formatChangeMoney(amountGiven)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <CircleAlert className="mt-0.5 size-5 shrink-0" />

                  <div>
                    <p className="font-semibold">
                      Record {formatChangeMoney(fare)} as income
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      The customer's full payment is not income.
                      Only the fare received is recorded.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                className="h-12 w-full"
                onClick={completeChange}
              >
                <Check />
                Receive {formatChangeQuickAmount(fare)}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={reset}
              >
                Start over
              </Button>
            </div>
          )}
      </section>
    </main>
  )
}
