"use client";

import { useRouter } from "next/navigation";
import { clearDriverSession } from "@/lib/driver/session";
import type { DriverSession } from "@/lib/driver/types";

export function DriverHeader({ session }: { session: DriverSession }) {
  const router = useRouter();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Driver app</p>
          <h1 className="text-lg font-semibold text-slate-950">{session.fullName}</h1>
        </div>
        <button
          type="button"
          onClick={() => {
            clearDriverSession();
            router.replace("/login");
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
