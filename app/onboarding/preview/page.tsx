"use client";

import { useState } from "react";
import { DriverOnboardingForm } from "../DriverOnboardingForm";
import { RepresentativeOnboardingForm } from "../RepresentativeOnboardingForm";

export default function OnboardingPreviewPage() {
  const [role, setRole] = useState<"driver" | "representative">("representative");

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center px-6 py-12" dir="rtl">
      <div className="w-full mb-4 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
        <span className="font-semibold">תצוגה מקדימה בלבד</span> — הטופס לא שולח נתונים אמיתיים
      </div>

      <div className="w-full flex gap-2 mb-2">
        <button
          onClick={() => setRole("representative")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${role === "representative" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
        >
          נציג
        </button>
        <button
          onClick={() => setRole("driver")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${role === "driver" ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
        >
          נהג
        </button>
      </div>

      <section className="w-full rounded-lg border bg-card p-8 shadow-sm">
        <h1 className="text-right text-2xl font-semibold">השלמת הרשמה</h1>
        <p className="mt-4 text-right text-sm text-muted-foreground">
          ההזמנה אומתה והחיבור המאובטח מוכן.
        </p>
        {role === "representative" ? <RepresentativeOnboardingForm /> : <DriverOnboardingForm />}
      </section>
    </main>
  );
}
