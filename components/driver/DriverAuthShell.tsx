"use client";

import Image from "next/image";
import Link from "next/link";
import { LanguageSwitch, useDriverI18n } from "@/components/driver/DriverI18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DriverAuthShell({
  children,
  title,
  body,
}: {
  children: React.ReactNode;
  title: string;
  body: string;
}) {
  const { direction, t } = useDriverI18n();

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-5 text-white" dir={direction}>
      <Image
        src="/photo ambulans.jpeg"
        alt=""
        fill
        sizes="100vw"
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/72" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.25),transparent_32rem)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col">
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

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_28rem] lg:py-10">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-200">{t("landingEyebrow")}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-white sm:text-5xl">{t("landingTitle")}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-200">{t("landingBody")}</p>
          </div>

          <Card className="w-full border-white/15 bg-white/95 p-6 text-slate-950 shadow-2xl shadow-slate-950/35 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t("landingEyebrow")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
            {children}
          </Card>
        </section>
      </div>
    </main>
  );
}
