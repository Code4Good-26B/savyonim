import { translateStatus, useDriverI18n } from "@/components/driver/DriverI18n";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
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
  const tone =
    status === "in_progress"
      ? "blue"
      : status === "assigned"
        ? "amber"
        : status === "completed"
          ? "emerald"
          : status === "rejected"
            ? "red"
            : "slate";

  return <Badge tone={tone}>{translateStatus(status, t)}</Badge>;
}

function RouteLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="grid gap-1 text-sm leading-6 sm:grid-cols-[4rem_1fr]">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="min-w-0 text-slate-900">{value}</span>
    </p>
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
  actionTone?: "primary" | "secondary";
}) {
  return (
    <Card className="h-full transition hover:border-blue-200 hover:shadow-md hover:shadow-slate-200/80">
      <CardContent className="flex h-full flex-col">
        <div className="flex-1">{children}</div>
        <ButtonLink href={href} variant={actionTone} className="mt-5 w-full">
          {action}
        </ButtonLink>
      </CardContent>
    </Card>
  );
}

export function OpenRideCard({ ride }: { ride: RideRequestSummary }) {
  const { language, t } = useDriverI18n();

  return (
    <RideCardFrame href={`/driver/rides/${ride.id}`} action={t("viewDetails")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {formatPickup(ride.requested_pickup_at, language, t("pickupTimeNotSet"))}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{t("openRide")}</h3>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-5 space-y-3">
        <RouteLine label={t("from")} value={ride.source_address} />
        <RouteLine label={t("to")} value={ride.destination_address} />
      </div>
    </RideCardFrame>
  );
}

export function AssignedRideCard({ ride }: { ride: RideSummary }) {
  const { language, t } = useDriverI18n();
  const request = ride.ride_request;

  return (
    <RideCardFrame href={`/driver/rides/${ride.id}`} action={t("continueRide")} actionTone="primary">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {formatPickup(request?.requested_pickup_at, language, t("pickupTimeNotSet"))}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{t("yourRide")}</h3>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-5 space-y-3">
        <RouteLine label={t("from")} value={request?.source_address ?? t("sourceUnavailable")} />
        <RouteLine label={t("to")} value={request?.destination_address ?? t("destinationUnavailable")} />
      </div>
    </RideCardFrame>
  );
}

export function RideHistoryCard({ ride }: { ride: RideSummary }) {
  const { language, t } = useDriverI18n();
  const request = ride.ride_request;
  const historyDate = ride.completed_at ?? ride.rejected_at ?? request?.requested_pickup_at ?? ride.assigned_at;

  return (
    <RideCardFrame href={`/driver/rides/${ride.id}`} action={t("viewDetails")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {formatPickup(historyDate, language, t("pickupTimeNotSet"))}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">{t("pastRide")}</h3>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-5 space-y-3">
        <RouteLine label={t("from")} value={request?.source_address ?? t("sourceUnavailable")} />
        <RouteLine label={t("to")} value={request?.destination_address ?? t("destinationUnavailable")} />
      </div>
    </RideCardFrame>
  );
}
