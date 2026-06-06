"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDriverI18n } from "@/components/driver/DriverI18n";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { AssignedRideActions, OpenRideActions } from "@/components/driver/RideActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getDriverRideDetail } from "@/lib/driver/api";
import { getStoredDriverSession } from "@/lib/driver/session";
import type {
  DriverApiError,
  DriverRideDetail,
  DriverSession,
  RideRequestSummary,
  RideSummary,
} from "@/lib/driver/types";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-b-0 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="text-sm leading-6 text-slate-900">{value}</dd>
    </div>
  );
}

function RideRequestDetails({ ride }: { ride: RideRequestSummary }) {
  const { t } = useDriverI18n();

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t("rideDetails")}</p>
      </CardHeader>
      <CardContent>
        <dl>
          <DetailRow label={t("from")} value={ride.source_address} />
          {ride.source_notes ? <DetailRow label={t("pickupNotes")} value={ride.source_notes} /> : null}
          <DetailRow label={t("to")} value={ride.destination_address} />
          {ride.destination_notes ? <DetailRow label={t("dropoffNotes")} value={ride.destination_notes} /> : null}
          <DetailRow label={t("returnTrip")} value={ride.return_trip_required ? t("yes") : t("no")} />
          <DetailRow label={t("pickupTime")} value={ride.requested_pickup_at ?? t("notSet")} />
        </dl>
      </CardContent>
    </Card>
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
    return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-700">{t("checkingSession")}</main>;
  }

  const rideRequest =
    detail?.kind === "open" ? detail.rideRequest : detail?.kind === "assigned" ? detail.ride.ride_request : null;

  return (
    <div className="min-h-screen bg-slate-50" dir={direction}>
      <DriverHeader session={session} />
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6">
        <Link
          href="/driver/dashboard"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700 transition hover:text-blue-800"
        >
          {t("backToDashboard")}
        </Link>

        {isLoading ? <DriverNotice title={t("loadingRide")}>{t("loadingRideBody")}</DriverNotice> : null}

        {error ? (
          <DriverNotice title={t("couldNotLoadRide")} kind="error">
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
            session={session}
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
