"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { LanguageSwitch, useDriverI18n } from "@/components/driver/DriverI18n";
import { Button } from "@/components/ui/button";
import { clearDriverSession } from "@/lib/driver/session";
import type { DriverSession } from "@/lib/driver/types";

export function DriverHeader({ session }: { session: DriverSession }) {
  const router = useRouter();
  const { t } = useDriverI18n();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-card shadow-sm">
            <Image
              src="/savionim-logo.svg"
              alt={t("savionim")}
              width={44}
              height={52}
              className="h-10 w-auto"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("appName")}</p>
            <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">{session.fullName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <Button
            type="button"
            onClick={() => {
              clearDriverSession();
              router.replace("/login");
            }}
            aria-label={t("logout")}
            title={t("logout")}
            variant="outline"
            className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800 focus-visible:ring-red-500"
          >
            {t("logout")}
          </Button>
        </div>
      </div>
    </header>
  );
}
