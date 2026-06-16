"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  establishOnboardingSession,
  type OnboardingRole,
} from "./session";

type InviteState =
  | { status: "verifying" }
  | { status: "ready"; role: OnboardingRole }
  | { status: "error"; message: string };

export function DriverOnboardingContainer() {
  return (
    <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4" data-testid="driver-onboarding-container">
      <h2 className="text-lg font-semibold text-blue-950">Driver onboarding</h2>
      <p className="mt-2 text-sm text-blue-900">
        Your invitation is verified. The driver registration form will appear here.
      </p>
    </div>
  );
}

export function RepresentativeOnboardingContainer() {
  return (
    <div
      className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4"
      data-testid="representative-onboarding-container"
    >
      <h2 className="text-lg font-semibold text-emerald-950">Representative onboarding</h2>
      <p className="mt-2 text-sm text-emerald-900">
        Your invitation is verified. The representative registration form will appear here.
      </p>
    </div>
  );
}

export function OnboardingRoleContainer({ role }: { role: OnboardingRole }) {
  if (role === "driver") return <DriverOnboardingContainer />;
  return <RepresentativeOnboardingContainer />;
}

export default function OnboardingPage() {
  const [state, setState] = useState<InviteState>({ status: "verifying" });

  useEffect(() => {
    let active = true;

    async function establishInviteSession() {
      const supabase = createBrowserSupabaseClient();
      const result = await establishOnboardingSession(supabase, window.location.search);

      if (!active) return;

      if (result.ok) {
        window.history.replaceState(null, "", "/onboarding");
        setState({ status: "ready", role: result.role });
      } else {
        setState({ status: "error", message: result.message });
      }
    }

    void establishInviteSession().catch(() => {
      if (active) {
        setState({
          status: "error",
          message: "This invitation link is invalid or expired. Ask an administrator for a new invitation.",
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Complete your registration</h1>
        {state.status === "verifying" && (
          <p className="mt-4" role="status" aria-live="polite">
            Verifying your invitation...
          </p>
        )}
        {state.status === "ready" && (
          <>
            <p className="mt-4" role="status" aria-live="polite">
              Your invitation is verified and your secure session is ready.
            </p>
            <OnboardingRoleContainer role={state.role} />
          </>
        )}
        {state.status === "error" && (
          <p className="mt-4 text-destructive" role="alert">
            {state.message}
          </p>
        )}
      </section>
    </main>
  );
}
