"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDriverI18n } from "@/components/driver/DriverI18n";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { AssignedRideActions, OpenRideActions } from "@/components/driver/RideActions";
import { User, Phone, MapPin, Clock, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getDriverRideDetail } from "@/lib/driver/api";
import { getStoredDriverSession } from "@/lib/driver/session";
import type {
  DriverApiError,
  DriverRideDetail,
  DriverSession,
  RideRequestSummary,
  RideSummary,
} from "@/lib/driver/types";

export function RideRequestDetails({ ride }: { ride: RideRequestSummary }) {
  const { t } = useDriverI18n();
  const passenger = ride.passenger;

  return (
    <Card className="border-2">
      <CardContent className="space-y-6 p-6">
        {/* Passenger */}
        {passenger ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-lg">
              <User className="h-6 w-6 text-primary" />
              <span className="font-semibold">{passenger.full_name}</span>
            </div>
            {passenger.phone ? (
              <div className="flex items-center gap-3 text-base text-muted-foreground">
                <Phone className="h-5 w-5" />
                <a href={`tel:${passenger.phone}`} className="hover:underline" dir="ltr">
                  {passenger.phone}
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("passengerUnavailable")}</p>
        )}

        {/* Pickup / dropoff with map pins */}
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 pt-1 text-right">
              <p className="mb-1 text-sm font-medium text-muted-foreground">{t("from")}</p>
              <p className="text-base font-medium">{ride.source_address}</p>
              {ride.source_notes ? (
                <p className="mt-1 text-sm text-muted-foreground">{ride.source_notes}</p>
              ) : null}
            </div>
          </div>
          <div className="mr-5 h-6 w-px bg-border" />
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <MapPin className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1 pt-1 text-right">
              <p className="mb-1 text-sm font-medium text-muted-foreground">{t("to")}</p>
              <p className="text-base font-medium">{ride.destination_address}</p>
              {ride.destination_notes ? (
                <p className="mt-1 text-sm text-muted-foreground">{ride.destination_notes}</p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Pickup time + return trip */}
        <div className="grid grid-cols-2 items-center gap-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t("pickupTime")}</p>
              <p className="text-sm font-medium">{ride.requested_pickup_at ?? t("notSet")}</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Repeat className="h-5 w-5 text-muted-foreground" />
            <Badge variant={ride.return_trip_required ? "default" : "secondary"}>
              {ride.return_trip_required ? t("yes") : t("no")}
            </Badge>
          </div>
        </div>

        {/* Passenger mobility / category / emergency contact (real data) */}
        {passenger ? (
          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{t("passengerMobility")}</p>
              <p className="font-medium">{passenger.mobility_need.replaceAll("_", " ")}</p>
            </div>
            {passenger.category ? (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{t("passengerCategory")}</p>
                <p className="font-medium">{passenger.category.replaceAll("_", " ")}</p>
              </div>
            ) : null}
            {passenger.emergency_contact ? (
              <div className="col-span-2 text-right">
                <p className="text-xs text-muted-foreground">{t("passengerEmergencyContact")}</p>
                <p className="font-medium">{passenger.emergency_contact}</p>
              </div>
            ) : null}
          </div>
        ) : null}
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
      router.replace("/");
      return;
    }
    const timer = window.setTimeout(() => {
      void load(session);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, router, session]);

  if (!session) {
    return <main className="min-h-screen bg-background px-4 py-8 text-foreground">{t("checkingSession")}</main>;
  }

  const rideRequest =
    detail?.kind === "open" ? detail.rideRequest : detail?.kind === "assigned" ? detail.ride.ride_request : null;

  return (
    <div className="min-h-screen bg-background" dir={direction}>
      <main className="mx-auto max-w-md space-y-5 px-4 py-6">
        <Link
          href="/driver"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground transition hover:text-foreground"
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
              variant="destructive"
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
              if (ride.status === "rejected") {
                router.replace("/driver");
                return;
              }
              setDetail({ kind: "assigned", ride });
              void load(session);
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
