import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bike,
  CarFront,
  Check,
  ChevronRight,
  Phone,
  User,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { saveOnboarding } from '@/db/localStore'
import type { VehicleType } from '@/types/app'

type Step = 'vehicle' | 'phone' | 'name' | 'verify' | 'ready'

export function Onboarding() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('vehicle')
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  function chooseVehicle(type: VehicleType) {
    setVehicleType(type)
    setStep('phone')
  }

  function continuePhone() {
    if (phone.trim().length < 9) return
    setStep('name')
  }

  function continueName() {
    if (name.trim().length < 2) return
    setStep('verify')
  }

  function verify() {
    if (code.length !== 4) return

    saveOnboarding({
      vehicleType: vehicleType!,
      phone: phone.trim(),
      name: name.trim(),
      completed: true,
    })

    setStep('ready')
  }

  function finish() {
    navigate(vehicleType === 'boda' ? '/boda/working' : '/vehicle')
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
        {step === 'vehicle' && (
          <VehicleStep onChoose={chooseVehicle} />
        )}

        {step === 'phone' && (
          <PhoneStep
            phone={phone}
            setPhone={setPhone}
            onContinue={continuePhone}
          />
        )}

        {step === 'name' && (
          <NameStep
            name={name}
            setName={setName}
            onContinue={continueName}
          />
        )}

        {step === 'verify' && (
          <VerifyStep
            code={code}
            setCode={setCode}
            onVerify={verify}
          />
        )}

        {step === 'ready' && (
          <ReadyStep
            name={name}
            vehicleType={vehicleType!}
            onFinish={finish}
          />
        )}
      </div>
    </main>
  )
}

function VehicleStep({
  onChoose,
}: {
  onChoose: (type: VehicleType) => void
}) {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          TRANSPORT MONEY
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          What do you use for work?
        </h1>

        <p className="text-muted-foreground">
          Choose what you use to earn money.
        </p>
      </div>

      <div className="space-y-3">
        <ChoiceCard
          icon={<Bike className="size-7" />}
          title="Boda Boda"
          description="I work using a motorcycle."
          onClick={() => onChoose('boda')}
        />

        <ChoiceCard
          icon={<CarFront className="size-7" />}
          title="Vehicle"
          description="I work using a car, taxi, van, coaster or other vehicle."
          onClick={() => onChoose('vehicle')}
        />
      </div>
    </section>
  )
}

function ChoiceCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border bg-card p-5 text-left transition hover:bg-muted active:scale-[0.99]"
    >
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}

function PhoneStep({
  phone,
  setPhone,
  onContinue,
}: {
  phone: string
  setPhone: (value: string) => void
  onContinue: () => void
}) {
  return (
    <section className="space-y-8">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Phone className="size-7" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          What's your phone number?
        </h1>

        <p className="text-muted-foreground">
          We'll use it to protect your account.
        </p>
      </div>

      <div className="space-y-3">
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XXXXXXXX"
          inputMode="tel"
          autoFocus
          className="h-12 w-full rounded-xl border bg-background px-4 outline-none focus:ring-2 focus:ring-ring"
        />

        <Button className="h-12 w-full" size="lg" onClick={onContinue}>
          Continue
          <ChevronRight />
        </Button>
      </div>
    </section>
  )
}

function NameStep({
  name,
  setName,
  onContinue,
}: {
  name: string
  setName: (value: string) => void
  onContinue: () => void
}) {
  return (
    <section className="space-y-8">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <User className="size-7" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          What's your name?
        </h1>

        <p className="text-muted-foreground">
          We'll use your name to personalize the app.
        </p>
      </div>

      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoFocus
          className="h-12 w-full rounded-xl border bg-background px-4 outline-none focus:ring-2 focus:ring-ring"
        />

        <Button className="h-12 w-full" size="lg" onClick={onContinue}>
          Continue
          <ChevronRight />
        </Button>
      </div>
    </section>
  )
}

function VerifyStep({
  code,
  setCode,
  onVerify,
}: {
  code: string
  setCode: (value: string) => void
  onVerify: () => void
}) {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          VERIFICATION
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          Verify your phone
        </h1>

        <p className="text-muted-foreground">
          Enter the 4-digit code sent to your phone.
        </p>
      </div>

      <div className="space-y-3">
        <input
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, ''))
          }
          placeholder="1234"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          className="h-14 w-full rounded-xl border bg-background px-4 text-center text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-ring"
        />

        <Button className="h-12 w-full" size="lg" onClick={onVerify}>
          Verify
          <Check />
        </Button>
      </div>
    </section>
  )
}

function ReadyStep({
  name,
  vehicleType,
  onFinish,
}: {
  name: string
  vehicleType: VehicleType
  onFinish: () => void
}) {
  return (
    <section className="space-y-8 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-muted">
        <Check className="size-10" />
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          You're ready, {name}.
        </h1>

        <p className="text-muted-foreground">
          Your {vehicleType === 'boda' ? 'Boda Boda' : 'Vehicle'} experience
          is ready to use.
        </p>
      </div>

      <Button className="h-12 w-full" size="lg" onClick={onFinish}>
        Start using Transport Money
      </Button>
    </section>
  )
}
