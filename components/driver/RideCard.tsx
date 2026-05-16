import Link from "next/link";
import { translateStatus, useDriverI18n } from "@/components/driver/DriverI18n";
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
      ? "bg-blue-100 text-blue-800"
      : status === "assigned"
        ? "bg-amber-100 text-amber-800"
        : status === "completed"
          ? "bg-emerald-100 text-emerald-800"
          : status === "rejected"
            ? "bg-red-100 text-red-800"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {translateStatus(status, t)}
    </span>
  );
}

export function OpenRideCard({ ride }: { ride: RideRequestSummary }) {
  const { language, t } = useDriverI18n();

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {formatPickup(ride.requested_pickup_at, language, t("pickupTimeNotSet"))}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{t("openRide")}</h3>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p>
          <span className="font-semibold text-slate-700">{t("from")}</span>{" "}
          <span className="text-slate-900">{ride.source_address}</span>
        </p>
        <p>
          <span className="font-semibold text-slate-700">{t("to")}</span>{" "}
          <span className="text-slate-900">{ride.destination_address}</span>
        </p>
      </div>
      <Link
        href={`/driver/rides/${ride.id}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
      >
        {t("viewDetails")}
      </Link>
    </article>
  );
}

export function AssignedRideCard({ ride }: { ride: RideSummary }) {
  const { language, t } = useDriverI18n();
  const request = ride.ride_request;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {formatPickup(request?.requested_pickup_at, language, t("pickupTimeNotSet"))}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{t("yourRide")}</h3>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p>
          <span className="font-semibold text-slate-700">{t("from")}</span>{" "}
          <span className="text-slate-900">{request?.source_address ?? t("sourceUnavailable")}</span>
        </p>
        <p>
          <span className="font-semibold text-slate-700">{t("to")}</span>{" "}
          <span className="text-slate-900">{request?.destination_address ?? t("destinationUnavailable")}</span>
        </p>
      </div>
      <Link
        href={`/driver/rides/${ride.id}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
      >
        {t("continueRide")}
      </Link>
    </article>
  );
}

export function RideHistoryCard({ ride }: { ride: RideSummary }) {
  const { language, t } = useDriverI18n();
  const request = ride.ride_request;
  const historyDate = ride.completed_at ?? ride.rejected_at ?? request?.requested_pickup_at ?? ride.assigned_at;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {formatPickup(historyDate, language, t("pickupTimeNotSet"))}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{t("pastRide")}</h3>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p>
          <span className="font-semibold text-slate-700">{t("from")}</span>{" "}
          <span className="text-slate-900">{request?.source_address ?? t("sourceUnavailable")}</span>
        </p>
        <p>
          <span className="font-semibold text-slate-700">{t("to")}</span>{" "}
          <span className="text-slate-900">{request?.destination_address ?? t("destinationUnavailable")}</span>
        </p>
      </div>
      <Link
        href={`/driver/rides/${ride.id}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
      >
        {t("viewDetails")}
      </Link>
    </article>
  );
}
