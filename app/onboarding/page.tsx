"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import {
  establishOnboardingSession,
  type OnboardingRole,
} from "./session";
import { DriverOnboardingForm } from "./DriverOnboardingForm";
import { RepresentativeOnboardingForm } from "./RepresentativeOnboardingForm";

const TEXT = {
  fallbackError: "\u05e7\u05d9\u05e9\u05d5\u05e8 \u05d4\u05d4\u05d6\u05de\u05e0\u05d4 \u05d0\u05d9\u05e0\u05d5 \u05ea\u05e7\u05d9\u05df \u05d0\u05d5 \u05e9\u05e4\u05d2 \u05ea\u05d5\u05e7\u05e4\u05d5. \u05d1\u05e7\u05e9\u05d5 \u05de\u05de\u05e0\u05d4\u05dc \u05dc\u05e9\u05dc\u05d5\u05d7 \u05d4\u05d6\u05de\u05e0\u05d4 \u05d7\u05d3\u05e9\u05d4.",
  pageTitle: "\u05d4\u05e9\u05dc\u05de\u05ea \u05d4\u05e8\u05e9\u05de\u05d4",
  verifying: "\u05de\u05e9\u05dc\u05d9\u05de\u05d9\u05dd \u05d0\u05ea \u05d0\u05d9\u05de\u05d5\u05ea \u05d4\u05d4\u05d6\u05de\u05e0\u05d4...",
  ready: "\u05d4\u05d4\u05d6\u05de\u05e0\u05d4 \u05d0\u05d5\u05de\u05ea\u05d4 \u05d5\u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05d4\u05de\u05d0\u05d5\u05d1\u05d8\u05d7 \u05de\u05d5\u05db\u05df.",
} as const;

type InviteState =
  | { status: "verifying" }
  | { status: "ready"; role: OnboardingRole }
  | { status: "error"; message: string };

export function DriverOnboardingContainer() {
  return (
    <div data-testid="driver-onboarding-container">
      <DriverOnboardingForm />
    </div>
  );
}

export function RepresentativeOnboardingContainer() {
  return (
    <div data-testid="representative-onboarding-container">
      <RepresentativeOnboardingForm />
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
          message: TEXT.fallbackError,
        });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12" dir="rtl">
      <section className="w-full rounded-lg border bg-card p-8 text-right shadow-sm">
        <h1 className="text-right text-2xl font-semibold">{TEXT.pageTitle}</h1>
        {state.status === "verifying" && (
          <p className="mt-4 text-right" role="status" aria-live="polite">
            {TEXT.verifying}
          </p>
        )}
        {state.status === "ready" && (
          <>
            <p className="mt-4 text-right" role="status" aria-live="polite">
              {TEXT.ready}
            </p>
            <OnboardingRoleContainer role={state.role} />
          </>
        )}
        {state.status === "error" && (
          <p className="mt-4 text-right text-destructive" role="alert">
            {state.message}
          </p>
        )}
      </section>
    </main>
  );
}
