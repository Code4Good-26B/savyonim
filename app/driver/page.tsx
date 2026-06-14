"use client";

import Image from "next/image";
import Link from "next/link";
import { LanguageSwitch, useDriverI18n } from "@/components/driver/DriverI18n";
import { Button } from "@/components/ui/button";

export default function DriverLandingPage() {
  const { direction, t } = useDriverI18n();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white" dir={direction}>
      <Image src="/photo ambulans.jpeg" alt="" fill sizes="100vw" priority className="object-cover" />
      <div className="absolute inset-0 bg-slate-950/70" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Image
            src="/savionim-logo.svg"
            alt={t("savionim")}
            width={178}
            height={212}
            priority
            className="h-16 w-auto rounded-lg bg-white/95 p-2 shadow-lg sm:h-20"
          />
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="border-white/25 bg-white/95 text-slate-900 hover:bg-white">
              <Link href="/">{t("backToHomepage")}</Link>
            </Button>
            <LanguageSwitch className="border-white/25 bg-white/95" />
          </div>
        </header>

        <main className="grid flex-1 items-center py-10">
          <section className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">{t("landingEyebrow")}</p>
            <h1 className="mt-3 text-4xl font-semibold text-white sm:text-6xl">{t("landingTitle")}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-200">{t("landingBody")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/login">{t("login")}</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/25 bg-white/95 text-slate-900 hover:bg-white">
                <Link href="/register-driver">{t("signup")}</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
