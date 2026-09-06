import { CarFront } from 'lucide-react'

export function VehicleComingSoon() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <section className="space-y-5 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-muted">
          <CarFront className="size-8" />
        </div>

        <h1 className="text-2xl font-semibold">
          Vehicle experience
        </h1>

        <p className="text-muted-foreground">
          The vehicle experience will be built next.
        </p>
      </section>
    </main>
  )
}
