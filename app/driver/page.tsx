"use client";

import Link from "next/link";
import { LanguageSwitch, useDriverI18n } from "@/components/driver/DriverI18n";

export default function DriverLandingPage() {
  const { direction, t } = useDriverI18n();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir={direction}>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="text-sm font-semibold text-slate-700 transition hover:text-slate-950">
          {t("savionim")}
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-blue-700 transition hover:text-blue-900">
            {t("backToHomepage")}
          </Link>
          <LanguageSwitch />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col px-5 pb-10 pt-8 sm:px-8 lg:min-h-[calc(100vh-84px)] lg:justify-center">
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">{t("landingEyebrow")}</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              {t("landingTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              {t("landingBody")}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-slate-950">{t("landingCapabilityTitle")}</h2>
            <div className="mt-5 divide-y divide-slate-200 border-y border-slate-200">
              <div className="py-4">
                <p className="text-sm font-semibold text-slate-950">{t("manageActiveRides")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t("manageActiveRidesBody")}</p>
              </div>
              <div className="py-4">
                <p className="text-sm font-semibold text-slate-950">{t("claimNearbyRequests")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t("claimNearbyRequestsBody")}</p>
              </div>
              <div className="py-4">
                <p className="text-sm font-semibold text-slate-950">{t("stayCoordinated")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t("stayCoordinatedBody")}</p>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
