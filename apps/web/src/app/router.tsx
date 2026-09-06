import { Navigate, Route, Routes } from 'react-router-dom'
import { getOnboarding } from '@/db/localStore'
import { Onboarding } from '@/features/onboarding/Onboarding'
import { BodaShell } from '@/features/boda/BodaShell'
import { BodaWorkingScreen } from '@/features/boda/BodaWorkingScreen'
import { ExpensesScreen } from '@/features/expenses/ExpensesScreen'
import { ChangeScreen } from '@/features/change/ChangeScreen'
import { ReportsScreen } from '@/features/reports/ReportsScreen'
import { VehicleComingSoon } from '@/features/vehicle/VehicleComingSoon'

function StartRedirect() {
  const onboarding = getOnboarding()

  if (!onboarding?.completed) {
    return <Navigate to="/onboarding" replace />
  }

  return onboarding.vehicleType === 'boda'
    ? <Navigate to="/boda/working" replace />
    : <Navigate to="/vehicle" replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<StartRedirect />} />

      <Route path="/onboarding" element={<Onboarding />} />

      <Route path="/boda" element={<BodaShell />}>
        <Route path="working" element={<BodaWorkingScreen />} />
        <Route path="expenses" element={<ExpensesScreen />} />
        <Route path="change" element={<ChangeScreen />} />
        <Route path="reports" element={<ReportsScreen />} />
        <Route index element={<Navigate to="working" replace />} />
      </Route>

      <Route path="/vehicle" element={<VehicleComingSoon />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
