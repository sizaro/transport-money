import { Bike } from 'lucide-react'
import { Outlet } from 'react-router-dom'
import { BottomNavigation } from '@/layouts/BottomNavigation'

export function BodaShell() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
            <Bike className="size-5" />
          </div>

          <div>
            <p className="text-sm font-semibold">Boda Boda</p>
            <p className="text-xs text-muted-foreground">
              Transport Money
            </p>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <BottomNavigation />
    </div>
  )
}
