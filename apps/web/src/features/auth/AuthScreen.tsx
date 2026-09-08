import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/app/providers'
import { apiLogin, apiRegister } from '@/lib/api'

type Mode = 'login' | 'register'

export function AuthScreen() {
  const navigate = useNavigate()
  const { completeOnboarding } = useApp()

  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [vehicleType, setVehicleType] = useState<'boda' | 'vehicle'>('boda')
  const [deviceName, setDeviceName] = useState('Transport Money')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function switchMode(nextMode: Mode) {
    setMode(nextMode)
    setError('')
    setPin('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!phone.trim()) {
      setError('Enter your phone number.')
      return
    }

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.')
      return
    }

    if (mode === 'register' && !name.trim()) {
      setError('Enter your name.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'register') {
        await apiRegister({
          phone,
          name: name.trim(),
          pin,
          vehicleType: vehicleType === 'boda' ? 'BODA' : 'VEHICLE',
        })

        await apiLogin({
          phone,
          pin,
          deviceName: deviceName.trim() || 'Transport Money',
        })

        completeOnboarding({
          vehicleType,
          phone: phone.trim(),
          name: name.trim(),
          completed: true,
        })
      } else {
        const result = await apiLogin({
          phone,
          pin,
          deviceName: deviceName.trim() || 'Transport Money',
        })

        completeOnboarding({
          vehicleType,
          phone: phone.trim(),
          name: result.user.name,
          completed: true,
        })
      }

      navigate(
        vehicleType === 'boda'
          ? '/boda/working'
          : '/vehicle',
        { replace: true },
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-8">
            <p className="text-sm font-medium text-muted-foreground">
              Transport Money
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {mode === 'login'
                ? 'Sign in and continue managing your work.'
                : 'Set up your Transport Money account.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
                  Name
                </label>

                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium"
              >
                Phone number
              </label>

              <input
                id="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="0771895506"
                inputMode="tel"
                autoComplete="tel"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label
                htmlFor="pin"
                className="mb-2 block text-sm font-medium"
              >
                4-digit PIN
              </label>

              <input
                id="pin"
                value={pin}
                onChange={(event) =>
                  setPin(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 4),
                  )
                }
                placeholder="••••"
                inputMode="numeric"
                autoComplete={
                  mode === 'login'
                    ? 'current-password'
                    : 'new-password'
                }
                maxLength={4}
                type="password"
                className="w-full rounded-xl border bg-background px-4 py-3 text-center text-xl tracking-[0.5em] outline-none focus:ring-2"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    What do you operate?
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVehicleType('boda')}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                        vehicleType === 'boda'
                          ? 'border-foreground bg-foreground text-background'
                          : 'bg-background'
                      }`}
                    >
                      Boda Boda
                    </button>

                    <button
                      type="button"
                      onClick={() => setVehicleType('vehicle')}
                      className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                        vehicleType === 'vehicle'
                          ? 'border-foreground bg-foreground text-background'
                          : 'bg-background'
                      }`}
                    >
                      Vehicle
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="deviceName"
                    className="mb-2 block text-sm font-medium"
                  >
                    Device name
                  </label>

                  <input
                    id="deviceName"
                    value={deviceName}
                    onChange={(event) =>
                      setDeviceName(event.target.value)
                    }
                    placeholder="My phone"
                    className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="font-semibold text-foreground underline underline-offset-4"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="font-semibold text-foreground underline underline-offset-4"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
