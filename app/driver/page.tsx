"use client";

import Image from "next/image";
import Link from "next/link";
import { LanguageSwitch, useDriverI18n } from "@/components/driver/DriverI18n";

export default function DriverLandingPage() {
  const { direction, t } = useDriverI18n();

  return (
    <div
      className="min-h-screen bg-slate-50 bg-cover bg-center text-slate-950"
      dir={direction}
      style={{ backgroundImage: "url('/photo%20ambulans.jpeg')" }}
    >
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-sm font-semibold text-slate-700 transition hover:text-slate-950">
          <Image
            src="/savionim-logo.svg"
            alt={t("savionim")}
            width={178}
            height={212}
            priority
            className="h-36 w-auto"
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black shadow-sm transition hover:text-slate-700">
            {t("backToHomepage")}
          </Link>
          <LanguageSwitch />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-10 pt-8 sm:px-8 lg:min-h-[calc(100vh-84px)] lg:justify-start">
        <section>
          <div>
            <h1 className="mb-6 rounded-lg bg-white/90 px-6 py-3 text-center text-4xl font-bold text-slate-950 shadow-lg">Driver Login</h1>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex min-h-12 items-center justify-center rounded-md bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {t("login")}
              </Link>
              <Link
                href="/register-driver"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-blue-300 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {t("signup")}
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
