"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const card = "rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-5";
const sectionTitle = "text-xs font-semibold uppercase tracking-widest text-gray-400";
const fieldWrap = "flex flex-col gap-1.5";
const labelCls = "text-sm font-medium text-gray-700";
const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "שגיאה בהתחברות");
        return;
      }

      router.replace("/admin/statistics");
    } catch {
      setError("שגיאת רשת — נסי שוב");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col gap-6">

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-900 text-lg font-bold shadow-sm">
            ס
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">סביונים</h1>
            <p className="text-sm text-slate-400">פאנל ניהול</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-900/30 px-4 py-3 text-sm text-red-300">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className={card}>
            <p className={sectionTitle}>פרטי כניסה</p>

            <div className={fieldWrap}>
              <label className={labelCls} htmlFor="email">אימייל</label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@savionim.co.il" className={inputCls}
              />
            </div>

            <div className={fieldWrap}>
              <label className={labelCls} htmlFor="password">סיסמה</label>
              <input
                id="password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="submit" disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isPending && (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}
            {isPending ? "מתחבר..." : "כניסה"}
          </button>
        </form>

      </div>
    </div>
  );
}
