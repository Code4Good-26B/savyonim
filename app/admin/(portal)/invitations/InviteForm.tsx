"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { sendAdminInvite } from "./actions";

const card = "rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-5";
const sectionTitle = "text-xs font-semibold uppercase tracking-widest text-gray-400";
const fieldWrap = "flex flex-col gap-1.5";
const label = "text-sm font-medium text-gray-700";
const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 disabled:opacity-50";
const select =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 bg-white disabled:opacity-50";

type InvitableRole = "representative" | "driver";

export function AdminInviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("driver");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendAdminInvite(email, role);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`הזמנה נשלחה לכתובת ${email}`);
        setEmail("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className={card}>
        <p className={sectionTitle}>שליחת הזמנה</p>

        <div className={fieldWrap}>
          <span className={label}>כתובת אימייל</span>
          <input
            type="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={input} disabled={isPending}
          />
        </div>

        <div className={fieldWrap}>
          <span className={label}>תפקיד</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as InvitableRole)}
            className={select} disabled={isPending}
          >
            <option value="driver">נהג</option>
            <option value="representative">נציג</option>
          </select>
        </div>
      </div>

      <button
        type="submit" disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
      >
        {isPending && (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {isPending ? "שולח..." : "שלח הזמנה"}
      </button>
    </form>
  );
}
