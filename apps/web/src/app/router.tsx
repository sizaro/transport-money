import { Navigate, Route, Routes } from "react-router-dom";

import { useApp } from "@/app/providers";

import { AuthScreen } from "@/features/auth/AuthScreen";
import { BodaShell } from "@/features/boda/BodaShell";
import { BodaWorkingScreen } from "@/features/boda/BodaWorkingScreen";
import { ExpensesScreen } from "@/features/expenses/ExpensesScreen";
import { ChangeScreen } from "@/features/change/ChangeScreen";
import { ReportsScreen } from "@/features/reports/ReportsScreen";
import { VehicleComingSoon } from "@/features/vehicle/VehicleComingSoon";

function StartRedirect() {
  const { auth, onboarding } = useApp();

  /*
   * No local authentication means the user needs
   * to register or log in.
   */
  if (!auth) {
    return <Navigate to="/auth" replace />;
  }

  /*
   * Authentication exists, but onboarding has not
   * been completed locally yet.
   *
   * Let AuthScreen finish the onboarding flow.
   */
  if (!onboarding?.completed) {
    return <Navigate to="/auth" replace />;
  }

  /*
   * Restore the user's configured application.
   */
  if (onboarding.vehicleType === "vehicle") {
    return <Navigate to="/vehicle" replace />;
  }

  return <Navigate to="/boda/working" replace />;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { auth, onboarding } = useApp();

  /*
   * No local auth means this is not an authenticated
   * application session.
   */
  if (!auth) {
    return <Navigate to="/auth" replace />;
  }

  /*
   * Auth exists but onboarding is incomplete.
   */
  if (!onboarding?.completed) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<StartRedirect />} />

      <Route path="/auth" element={<AuthScreen />} />

      <Route
        path="/boda"
        element={
          <RequireAuth>
            <BodaShell />
          </RequireAuth>
        }
      >
        <Route path="working" element={<BodaWorkingScreen />} />

        <Route path="expenses" element={<ExpensesScreen />} />

        <Route path="change" element={<ChangeScreen />} />

        <Route path="reports" element={<ReportsScreen />} />

        <Route index element={<Navigate to="working" replace />} />
      </Route>

      <Route
        path="/vehicle"
        element={
          <RequireAuth>
            <VehicleComingSoon />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
