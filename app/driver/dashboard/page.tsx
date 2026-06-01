"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDriverI18n } from "@/components/driver/DriverI18n";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { AssignedRideCard, OpenRideCard, RideHistoryCard } from "@/components/driver/RideCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDriverRides } from "@/lib/driver/api";
import { getStoredDriverSession } from "@/lib/driver/session";
import type { DriverApiError, DriverRidesResponse, DriverSession } from "@/lib/driver/types";

function DashboardSection({
  title,
  children,
  count,
}: {
  title: string;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {typeof count === "number" ? (
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <Card key={item}>
          <CardContent>
            <div className="h-4 w-32 rounded bg-slate-200" />
            <div className="mt-3 h-6 w-44 rounded bg-slate-200" />
            <div className="mt-6 space-y-3">
              <div className="h-4 rounded bg-slate-200" />
              <div className="h-4 w-10/12 rounded bg-slate-200" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

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
    return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-700">{t("checkingSession")}</main>;
  }

  return (
    <div className="min-h-screen bg-slate-50" dir={direction}>
      <DriverHeader session={session} />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <section className="rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm shadow-slate-200/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t("appName")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{t("currentWork")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("currentWorkBody")}</p>
            </div>
          </div>
        </section>

        {error ? (
          <DriverNotice title={t("couldNotLoadRides")} kind="error">
            {error}
            <Button
              type="button"
              onClick={() => void load(session)}
              variant="danger"
              className="mt-3"
            >
              {t("retry")}
            </Button>
          </DriverNotice>
        ) : null}

        {isLoading ? (
          <div className="space-y-4">
            <DriverNotice title={t("loadingRides")}>{t("loadingRidesBody")}</DriverNotice>
            <LoadingSkeleton />
          </div>
        ) : null}

        {!isLoading && rides ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryMetric label={t("assignedToYou")} value={rides.assignedRides.length} />
              <SummaryMetric label={t("openRides")} value={rides.openRides.length} />
              <SummaryMetric label={t("rideHistory")} value={rides.rideHistory.length} />
            </div>

            <DashboardSection title={t("assignedToYou")} count={rides.assignedRides.length}>
              {rides.assignedRides.length === 0 ? (
                <DriverNotice title={t("noAssignedRides")}>{t("noAssignedRidesBody")}</DriverNotice>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {rides.assignedRides.map((ride) => (
                    <AssignedRideCard key={ride.id} ride={ride} />
                  ))}
                </div>
              )}
            </DashboardSection>

            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardSection title={t("openRides")} count={rides.openRides.length}>
                {rides.openRides.length === 0 ? (
                  <DriverNotice title={t("noOpenRides")}>{t("noOpenRidesBody")}</DriverNotice>
                ) : (
                  <div className="grid gap-4">
                    {rides.openRides.map((ride) => (
                      <OpenRideCard key={ride.id} ride={ride} />
                    ))}
                  </div>
                )}
              </DashboardSection>

              <DashboardSection title={t("rideHistory")} count={rides.rideHistory.length}>
                {rides.rideHistory.length === 0 ? (
                  <DriverNotice title={t("noRideHistory")} />
                ) : (
                  <div className="grid gap-4">
                    {rides.rideHistory.map((ride) => (
                      <RideHistoryCard key={ride.id} ride={ride} />
                    ))}
                  </div>
                )}
              </DashboardSection>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
