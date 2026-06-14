"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";

type InviteState = "verifying" | "ready" | "invalid";

export default function OnboardingPage() {
  const [state, setState] = useState<InviteState>("verifying");

  useEffect(() => {
    let active = true;
    const supabase = createBrowserSupabaseClient();
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    async function establishInviteSession() {
      const existingSession = await supabase.auth.getSession();
      if (existingSession.data.session) {
        if (active) setState("ready");
        return;
      }

      if (!tokenHash || type !== "invite") {
        if (active) setState("invalid");
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "invite",
      });

      if (active) setState(!error && data.session ? "ready" : "invalid");
    }

    void establishInviteSession();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-12">
      <section className="w-full rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Complete your registration</h1>
        {state === "verifying" && <p className="mt-4">Verifying your invitation...</p>}
        {state === "ready" && (
          <p className="mt-4">Your invitation is verified and your secure session is ready.</p>
        )}
        {state === "invalid" && (
          <p className="mt-4 text-red-700">
            This invitation link is invalid or expired. Ask an administrator for a new invitation.
          </p>
        )}
      </section>
    </main>
  );
}
