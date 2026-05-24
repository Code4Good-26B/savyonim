"use client";

import { useRouter } from "next/navigation";
import { LanguageSwitch, useDriverI18n } from "@/components/driver/DriverI18n";
import { clearDriverSession } from "@/lib/driver/session";
import type { DriverSession } from "@/lib/driver/types";

export function DriverHeader({ session }: { session: DriverSession }) {
  const router = useRouter();
  const { t } = useDriverI18n();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t("appName")}</p>
          <h1 className="text-lg font-semibold text-slate-950">{session.fullName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <button
            type="button"
            onClick={() => {
              clearDriverSession();
              router.replace("/login");
            }}
            aria-label={t("logout")}
            title={t("logout")}
            className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white px-2 text-center text-xs font-semibold leading-tight text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            {t("logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
