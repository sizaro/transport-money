import { NavLink } from 'react-router-dom'
import {
  Banknote,
  CircleDollarSign,
  ClipboardList,
  Receipt,
} from 'lucide-react'

const items = [
  { label: 'Working', path: '/boda/working', icon: Banknote },
  { label: 'Expenses', path: '/boda/expenses', icon: Receipt },
  { label: 'Change', path: '/boda/change', icon: CircleDollarSign },
  { label: 'Reports', path: '/boda/reports', icon: ClipboardList },
]

export function BottomNavigation() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto grid max-w-5xl grid-cols-4">
        {items.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
                isActive ? 'text-foreground' : 'text-muted-foreground'
              }`
            }
          >
            <Icon className="size-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
