"use client";

import { useState } from "react";
import {
  acceptOpenRide,
  updateRideOdometer,
  updateRideStatus,
} from "@/lib/driver/api";
import type { DriverApiError, DriverSession, RideSummary } from "@/lib/driver/types";
import { DriverNotice } from "@/components/driver/DriverNotice";

function ActionButton({
  children,
  disabled,
  onClick,
  tone = "primary",
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  tone?: "primary" | "danger" | "secondary";
}) {
  const classes = {
    primary: "bg-blue-700 text-white disabled:bg-blue-300",
    danger: "bg-red-700 text-white disabled:bg-red-300",
    secondary: "bg-slate-950 text-white disabled:bg-slate-300",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-h-12 w-full rounded-md px-4 py-3 text-sm font-semibold ${classes[tone]}`}
    >
      {children}
    </button>
  );
}

export function OpenRideActions({
  rideRequestId,
  session,
  onAccepted,
}: {
  rideRequestId: string;
  session: DriverSession;
  onAccepted: (ride: RideSummary) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setIsPending(true);
    setError(null);
    try {
      const ride = await acceptOpenRide({ rideRequestId, session });
      onAccepted(ride);
    } catch (caught) {
      const apiError = caught as DriverApiError;
      setError(apiError.detail ?? "Could not take this ride.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? <DriverNotice title="Could not take ride" kind="error">{error}</DriverNotice> : null}
      <ActionButton disabled={isPending} onClick={handleAccept}>
        {isPending ? "Taking ride..." : "Take ride"}
      </ActionButton>
    </div>
  );
}

export function AssignedRideActions({
  ride,
  onChanged,
}: {
  ride: RideSummary;
  onChanged: (ride: RideSummary) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [odometerStart, setOdometerStart] = useState(ride.odometer_start_km?.toString() ?? "");
  const [odometerEnd, setOdometerEnd] = useState(ride.odometer_end_km?.toString() ?? "");

  async function run(action: () => Promise<RideSummary>) {
    setIsPending(true);
    setError(null);
    try {
      onChanged(await action());
    } catch (caught) {
      const apiError = caught as DriverApiError;
      setError(apiError.detail ?? "Could not update this ride.");
    } finally {
      setIsPending(false);
    }
  }

  async function completeRide() {
    const start = odometerStart ? Number(odometerStart) : undefined;
    const end = odometerEnd ? Number(odometerEnd) : undefined;

    if (start !== undefined && Number.isNaN(start)) {
      setError("Odometer start must be a number.");
      return;
    }
    if (end !== undefined && Number.isNaN(end)) {
      setError("Odometer end must be a number.");
      return;
    }
    if (start !== undefined && end !== undefined && end < start) {
      setError("Odometer end must be greater than or equal to odometer start.");
      return;
    }

    await run(async () => {
      await updateRideOdometer({
        rideId: ride.id,
        odometerStartKm: start,
        odometerEndKm: end,
      });
      return updateRideStatus({ rideId: ride.id, status: "completed" });
    });
  }

  return (
    <div className="space-y-4">
      {error ? <DriverNotice title="Action failed" kind="error">{error}</DriverNotice> : null}

      {ride.status === "assigned" ? (
        <ActionButton
          disabled={isPending}
          onClick={() => void run(() => updateRideStatus({ rideId: ride.id, status: "in_progress" }))}
        >
          {isPending ? "Starting..." : "Start ride"}
        </ActionButton>
      ) : null}

      {ride.status === "in_progress" ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-950">Complete ride</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Odometer start
              <input
                value={odometerStart}
                onChange={(event) => setOdometerStart(event.target.value)}
                inputMode="decimal"
                className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Odometer end
              <input
                value={odometerEnd}
                onChange={(event) => setOdometerEnd(event.target.value)}
                inputMode="decimal"
                className="mt-1 min-h-11 w-full rounded-md border border-slate-300 px-3 text-slate-950"
              />
            </label>
          </div>
          <div className="mt-4">
            <ActionButton disabled={isPending} onClick={() => void completeRide()} tone="secondary">
              {isPending ? "Completing..." : "Complete ride"}
            </ActionButton>
          </div>
        </div>
      ) : null}

      {ride.status === "assigned" || ride.status === "in_progress" ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="block text-sm font-medium text-slate-700">
            Reject/cancel reason
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-950"
            />
          </label>
          <div className="mt-4">
            <ActionButton
              disabled={isPending || rejectionReason.trim().length === 0}
              onClick={() =>
                void run(() =>
                  updateRideStatus({
                    rideId: ride.id,
                    status: "rejected",
                    rejectionReason,
                  }),
                )
              }
              tone="danger"
            >
              {isPending ? "Rejecting..." : "Reject ride"}
            </ActionButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
