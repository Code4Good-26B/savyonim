"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDriverI18n } from "@/components/driver/DriverI18n";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { AssignedRideActions, OpenRideActions } from "@/components/driver/RideActions";
import { getDriverRideDetail } from "@/lib/driver/api";
import { getStoredDriverSession } from "@/lib/driver/session";
import type {
  DriverApiError,
  DriverRideDetail,
  DriverSession,
  RideRequestSummary,
  RideSummary,
} from "@/lib/driver/types";

function RideRequestDetails({ ride }: { ride: RideRequestSummary }) {
  const { t } = useDriverI18n();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t("rideDetails")}</p>
      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-800">
        <p><span className="font-semibold">{t("from")}</span> {ride.source_address}</p>
        {ride.source_notes ? <p><span className="font-semibold">{t("pickupNotes")}</span> {ride.source_notes}</p> : null}
        <p><span className="font-semibold">{t("to")}</span> {ride.destination_address}</p>
        {ride.destination_notes ? <p><span className="font-semibold">{t("dropoffNotes")}</span> {ride.destination_notes}</p> : null}
        <p><span className="font-semibold">{t("returnTrip")}</span> {ride.return_trip_required ? t("yes") : t("no")}</p>
        <p><span className="font-semibold">{t("pickupTime")}</span> {ride.requested_pickup_at ?? t("notSet")}</p>
      </div>
    </section>
  );
}

export default function DriverRideDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { direction, t } = useDriverI18n();
  const [session] = useState<DriverSession | null>(() => getStoredDriverSession());
  const [detail, setDetail] = useState<DriverRideDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (nextSession: DriverSession) => {
    await Promise.resolve();
    setIsLoading(true);
    setError(null);
    try {
      setDetail(await getDriverRideDetail(params.id, nextSession));
    } catch (caught) {
      const apiError = caught as DriverApiError;
      setError(apiError.detail ?? "Could not load this ride.");
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

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

  const rideRequest =
    detail?.kind === "open" ? detail.rideRequest : detail?.kind === "assigned" ? detail.ride.ride_request : null;

  return (
    <div className="min-h-screen bg-slate-100" dir={direction}>
      <DriverHeader session={session} />
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <Link href="/driver/dashboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700">
          {t("backToDashboard")}
        </Link>

        {isLoading ? <DriverNotice title={t("loadingRide")}>{t("loadingRideBody")}</DriverNotice> : null}

        {error ? (
          <DriverNotice title={t("couldNotLoadRide")} kind="error">
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

        {rideRequest ? <RideRequestDetails ride={rideRequest} /> : null}

        {detail?.kind === "open" ? (
          <OpenRideActions
            rideRequestId={detail.rideRequest.id}
            session={session}
            onAccepted={(ride: RideSummary) => {
              setDetail({ kind: "assigned", ride });
              router.replace(`/driver/rides/${ride.id}`);
            }}
          />
        ) : null}

        {detail?.kind === "assigned" ? (
          <AssignedRideActions
            ride={detail.ride}
            onChanged={(ride: RideSummary) => {
              setDetail({ kind: "assigned", ride });
              void load(session);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
