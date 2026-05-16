import Link from "next/link";
import type { RideRequestSummary, RideSummary } from "@/lib/driver/types";

function formatPickup(value: string | null | undefined) {
  if (!value) return "Pickup time not set";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "in_progress"
      ? "bg-blue-100 text-blue-800"
      : status === "assigned"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function OpenRideCard({ ride }: { ride: RideRequestSummary }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{formatPickup(ride.requested_pickup_at)}</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">Open ride</h3>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p>
          <span className="font-semibold text-slate-700">From:</span>{" "}
          <span className="text-slate-900">{ride.source_address}</span>
        </p>
        <p>
          <span className="font-semibold text-slate-700">To:</span>{" "}
          <span className="text-slate-900">{ride.destination_address}</span>
        </p>
      </div>
      <Link
        href={`/driver/rides/${ride.id}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
      >
        View details
      </Link>
    </article>
  );
}

export function AssignedRideCard({ ride }: { ride: RideSummary }) {
  const request = ride.ride_request;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{formatPickup(request?.requested_pickup_at)}</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">Your ride</h3>
        </div>
        <StatusBadge status={ride.status} />
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <p>
          <span className="font-semibold text-slate-700">From:</span>{" "}
          <span className="text-slate-900">{request?.source_address ?? "Source address unavailable"}</span>
        </p>
        <p>
          <span className="font-semibold text-slate-700">To:</span>{" "}
          <span className="text-slate-900">{request?.destination_address ?? "Destination unavailable"}</span>
        </p>
      </div>
      <Link
        href={`/driver/rides/${ride.id}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
      >
        Continue ride
      </Link>
    </article>
  );
}
