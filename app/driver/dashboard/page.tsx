"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDriverI18n } from "@/components/driver/DriverI18n";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { AssignedRideCard, OpenRideCard, RideHistoryCard } from "@/components/driver/RideCard";
import { getDriverRides } from "@/lib/driver/api";
import { getStoredDriverSession } from "@/lib/driver/session";
import type { DriverApiError, DriverRidesResponse, DriverSession } from "@/lib/driver/types";

export default function DriverDashboardPage() {
  const router = useRouter();
  const { direction, t } = useDriverI18n();
  const [session] = useState<DriverSession | null>(() => getStoredDriverSession());
  const [rides, setRides] = useState<DriverRidesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (nextSession: DriverSession) => {
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      setRides(await getDriverRides(nextSession));
    } catch (caught) {
      const apiError = caught as DriverApiError;
      setError(apiError.detail ?? "Could not load driver rides.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!session || session.role !== "driver") {
      router.replace("/login");
      return;
    }
    const timer = window.setTimeout(() => {
      void load(session);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, router, session]);

  if (!session) {
    return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-700">{t("checkingSession")}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-100" dir={direction}>
      <DriverHeader session={session} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-950">{t("currentWork")}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {t("currentWorkBody")}
          </p>
        </section>

        {error ? (
          <DriverNotice title={t("couldNotLoadRides")} kind="error">
            {error}
            <button
              type="button"
              onClick={() => void load(session)}
              className="mt-3 block min-h-11 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            >
              {t("retry")}
            </button>
          </DriverNotice>
        ) : null}

        {isLoading ? (
          <DriverNotice title={t("loadingRides")}>{t("loadingRidesBody")}</DriverNotice>
        ) : null}

        {!isLoading && rides ? (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">{t("assignedToYou")}</h2>
              {rides.assignedRides.length === 0 ? (
                <DriverNotice title={t("noAssignedRides")}>{t("noAssignedRidesBody")}</DriverNotice>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {rides.assignedRides.map((ride) => (
                    <AssignedRideCard key={ride.id} ride={ride} />
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-950">{t("openRides")}</h2>
                {rides.openRides.length === 0 ? (
                  <DriverNotice title={t("noOpenRides")}>{t("noOpenRidesBody")}</DriverNotice>
                ) : (
                  <div className="grid gap-4">
                    {rides.openRides.map((ride) => (
                      <OpenRideCard key={ride.id} ride={ride} />
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-950">{t("rideHistory")}</h2>
                {rides.rideHistory.length === 0 ? (
                  <DriverNotice title={t("noRideHistory")} />
                ) : (
                  <div className="grid gap-4">
                    {rides.rideHistory.map((ride) => (
                      <RideHistoryCard key={ride.id} ride={ride} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
