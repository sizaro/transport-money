import { useState } from "react";
import { LogOut, User, Bike, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useApp } from "@/app/providers";
import { logoutAccount } from "@/lib/api";

export function ProfileScreen() {
  const navigate = useNavigate();
  const { auth, onboarding, clearAuthenticatedUser } = useApp();

  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setLoggingOut(true);

    try {
      await logoutAccount();

      clearAuthenticatedUser();

      navigate("/auth", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign out. Please try again.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  const vehicleLabel =
    onboarding?.vehicleType === "boda" ? "Boda Boda" : "Vehicle";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-6">
        <p className="text-sm font-medium text-muted-foreground">Account</p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight">Profile</h1>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
              <User className="size-7 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">
                {auth?.name || onboarding?.name || "Transport Money User"}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {auth?.phone || onboarding?.phone || "No phone number"}
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-5 py-4">
            <h2 className="font-semibold">Account information</h2>
          </div>

          <div className="divide-y">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Bike className="size-5 text-muted-foreground" />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Vehicle type</p>

                <p className="mt-1 font-medium">{vehicleLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Smartphone className="size-5 text-muted-foreground" />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Device</p>

                <p className="mt-1 font-medium">Transport Money</p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">Account actions</h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Sign out of Transport Money on this device.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-3 font-semibold text-destructive transition hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut className="size-5" />

            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </section>
      </div>
    </main>
  );
}
