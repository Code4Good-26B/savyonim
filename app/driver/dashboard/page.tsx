"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { AssignedRideCard, OpenRideCard } from "@/components/driver/RideCard";
import { getDriverRides } from "@/lib/driver/api";
import { getStoredDriverSession } from "@/lib/driver/session";
import type { DriverApiError, DriverRidesResponse, DriverSession } from "@/lib/driver/types";

export default function DriverDashboardPage() {
  const router = useRouter();
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
    return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-700">Checking driver session...</main>;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DriverHeader session={session} />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <section>
          <h2 className="text-xl font-semibold text-slate-950">Current work</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Review rides assigned to you and open rides in your service zone.
          </p>
        </section>

        {error ? (
          <DriverNotice title="Could not load rides" kind="error">
            {error}
            <button
              type="button"
              onClick={() => void load(session)}
              className="mt-3 block min-h-11 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </DriverNotice>
        ) : null}

        {isLoading ? (
          <DriverNotice title="Loading rides">Fetching your assigned and open rides...</DriverNotice>
        ) : null}

        {!isLoading && rides ? (
          <>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">Assigned to you</h2>
              {rides.assignedRides.length === 0 ? (
                <DriverNotice title="No assigned rides">You do not have an active assigned ride.</DriverNotice>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {rides.assignedRides.map((ride) => (
                    <AssignedRideCard key={ride.id} ride={ride} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">Open rides</h2>
              {rides.openRides.length === 0 ? (
                <DriverNotice title="No open rides">There are no open rides in your service zone right now.</DriverNotice>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {rides.openRides.map((ride) => (
                    <OpenRideCard key={ride.id} ride={ride} />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
