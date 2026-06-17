import Link from "next/link";
import { MapPin } from "lucide-react";
import {
  translateStatus,
  useDriverI18n,
  type DriverTranslationKey,
} from "@/components/driver/DriverI18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { RideRequestSummary, RideSummary } from "@/lib/driver/types";

function formatPickup(value: string | null | undefined, language: "en" | "he", fallback: string) {
  if (!value) return fallback;

  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useDriverI18n();
  const statusClass =
    status === "in_progress"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : status === "assigned"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : status === "completed"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : status === "rejected"
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-border bg-muted text-foreground";

  return (
    <Badge variant="outline" className={statusClass}>
      {translateStatus(status, t)}
    </Badge>
  );
}

function RoutePins({
  source,
  destination,
  t,
}: {
  source: string;
  destination: string;
  t: (key: DriverTranslationKey) => string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
          <MapPin className="h-4 w-4 text-green-600" />
        </div>
        <div className="flex-1 pt-1 text-right">
          <p className="text-xs font-medium text-muted-foreground">{t("from")}</p>
          <p className="text-sm font-medium">{source}</p>
        </div>
      </div>
      <div className="mr-4 h-4 w-px bg-border" />
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
          <MapPin className="h-4 w-4 text-red-600" />
        </div>
        <div className="flex-1 pt-1 text-right">
          <p className="text-xs font-medium text-muted-foreground">{t("to")}</p>
          <p className="text-sm font-medium">{destination}</p>
        </div>
      </div>
    </div>
  );
}

function RideCardFrame({
  children,
  href,
  action,
  actionTone = "secondary",
}: {
  children: React.ReactNode;
  href: string;
  action: string;
  actionTone?: "default" | "secondary";
}) {
  return (
    <Card className="h-full transition hover:shadow-md">
      <CardContent className="flex h-full flex-col">
        <div className="flex-1 space-y-4">{children}</div>
        <Button asChild variant={actionTone} className="mt-5 w-full">
          <Link href={href}>{action}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function RideCardHeader({ time, title, status }: { time: string; title: string; status: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{time}</p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <StatusBadge status={status} />
    </div>
  );
}

export function OpenRideCard({ ride }: { ride: RideRequestSummary }) {
  const { language, t } = useDriverI18n();

  return (
    <RideCardFrame href={`/driver/rides/${ride.id}`} action={t("viewDetails")}>
      <RideCardHeader
        time={formatPickup(ride.requested_pickup_at, language, t("pickupTimeNotSet"))}
        title={t("openRide")}
        status={ride.status}
      />
      <RoutePins source={ride.source_address} destination={ride.destination_address} t={t} />
    </RideCardFrame>
  );
}

export function AssignedRideCard({ ride }: { ride: RideSummary }) {
  const { language, t } = useDriverI18n();
  const request = ride.ride_request;

  return (
    <RideCardFrame href={`/driver/rides/${ride.id}`} action={t("continueRide")} actionTone="default">
      <RideCardHeader
        time={formatPickup(request?.requested_pickup_at, language, t("pickupTimeNotSet"))}
        title={t("yourRide")}
        status={ride.status}
      />
      <RoutePins
        source={request?.source_address ?? t("sourceUnavailable")}
        destination={request?.destination_address ?? t("destinationUnavailable")}
        t={t}
      />
    </RideCardFrame>
  );
}

export function RideHistoryCard({ ride }: { ride: RideSummary }) {
  const { language, t } = useDriverI18n();
  const request = ride.ride_request;
  const historyDate = ride.completed_at ?? ride.rejected_at ?? request?.requested_pickup_at ?? ride.assigned_at;

  return (
    <RideCardFrame href={`/driver/rides/${ride.id}`} action={t("viewDetails")}>
      <RideCardHeader
        time={formatPickup(historyDate, language, t("pickupTimeNotSet"))}
        title={t("pastRide")}
        status={ride.status}
      />
      <RoutePins
        source={request?.source_address ?? t("sourceUnavailable")}
        destination={request?.destination_address ?? t("destinationUnavailable")}
        t={t}
      />
    </RideCardFrame>
  );
}
