"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      localStorage.removeItem("savionim.representativeSession");
    } catch { /* ignore */ }
    await fetch("/api/auth/logout?portal=representative", { method: "POST" });
    router.replace("/");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {pending ? "יוצא..." : "יציאה"}
    </button>
  );
}
