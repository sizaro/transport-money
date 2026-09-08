import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthScreen } from '@/features/auth/AuthScreen'
import { BodaShell } from '@/features/boda/BodaShell'
import { BodaWorkingScreen } from '@/features/boda/BodaWorkingScreen'
import { ExpensesScreen } from '@/features/expenses/ExpensesScreen'
import { ChangeScreen } from '@/features/change/ChangeScreen'
import { ReportsScreen } from '@/features/reports/ReportsScreen'
import { VehicleComingSoon } from '@/features/vehicle/VehicleComingSoon'

function StartRedirect() {
  const onboarding =
    typeof window !== 'undefined'
      ? null
      : null

  void onboarding

  return <Navigate to="/auth" replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<StartRedirect />} />

      <Route path="/auth" element={<AuthScreen />} />

      <Route path="/boda" element={<BodaShell />}>
        <Route
          path="working"
          element={<BodaWorkingScreen />}
        />
        <Route
          path="expenses"
          element={<ExpensesScreen />}
        />
        <Route
          path="change"
          element={<ChangeScreen />}
        />
        <Route
          path="reports"
          element={<ReportsScreen />}
        />
        <Route
          index
          element={
            <Navigate
              to="working"
              replace
            />
          }
        />
      </Route>

      <Route
        path="/vehicle"
        element={<VehicleComingSoon />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/auth"
            replace
          />
        }
      />
    </Routes>
  )
}
