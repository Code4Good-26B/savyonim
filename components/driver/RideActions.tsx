"use client";

import { useState } from "react";
import {
  acceptOpenRide,
  completeRide as completeRideRequest,
  updateRideStatus,
} from "@/lib/driver/api";
import { useDriverI18n } from "@/components/driver/DriverI18n";
import type { DriverApiError, DriverSession, RideSummary } from "@/lib/driver/types";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FieldLabel, Input, Textarea } from "@/components/ui/input";

function ActionButton({
  children,
  disabled,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
  tone?: "default" | "destructive" | "secondary";
}) {
  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={onClick}
      variant={tone}
      size="lg"
      className="w-full"
    >
      {children}
    </Button>
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
  const { t } = useDriverI18n();
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
      {error ? <DriverNotice title={t("couldNotTakeRide")} kind="error">{error}</DriverNotice> : null}
      <ActionButton disabled={isPending} onClick={handleAccept}>
        {isPending ? t("takingRide") : t("takeRide")}
      </ActionButton>
    </div>
  );
}

export function AssignedRideActions({
  ride,
  session,
  onChanged,
}: {
  ride: RideSummary;
  session: DriverSession;
  onChanged: (ride: RideSummary) => void;
}) {
  const { t } = useDriverI18n();
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
      setError(t("odometerStartNumber"));
      return;
    }
    if (end === undefined || Number.isNaN(end)) {
      setError(t("odometerEndNumber"));
      return;
    }
    if (start !== undefined && end !== undefined && end < start) {
      setError(t("odometerEndGreater"));
      return;
    }

    await run(async () => {
      return completeRideRequest({
        rideId: ride.id,
        odometerStartKm: start,
        odometerEndKm: end,
        session,
      });
    });
  }

  return (
    <div className="space-y-4">
      {error ? <DriverNotice title={t("actionFailed")} kind="error">{error}</DriverNotice> : null}

      {ride.status === "assigned" || ride.status === "in_progress" ? (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-foreground">{t("completeRide")}</h2>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldLabel>
                {t("odometerStart")}
                <Input
                  value={odometerStart}
                  onChange={(event) => setOdometerStart(event.target.value)}
                  inputMode="decimal"
                />
              </FieldLabel>
              <FieldLabel>
                {t("odometerEnd")}
                <Input
                  value={odometerEnd}
                  onChange={(event) => setOdometerEnd(event.target.value)}
                  inputMode="decimal"
                />
              </FieldLabel>
            </div>
            <div className="mt-4">
              <ActionButton disabled={isPending} onClick={() => void completeRide()} tone="secondary">
                {isPending ? t("completeRidePending") : t("completeRide")}
              </ActionButton>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {ride.status === "assigned" || ride.status === "in_progress" ? (
        <Card>
          <CardContent>
            <FieldLabel>
              {t("rejectCancelReason")}
              <Textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
              />
            </FieldLabel>
            <div className="mt-4">
              <ActionButton
                disabled={isPending || rejectionReason.trim().length === 0}
                onClick={() =>
                  void run(() =>
                    updateRideStatus({
                      rideId: ride.id,
                      status: "rejected",
                      rejectionReason,
                      session,
                    }),
                  )
                }
                tone="destructive"
              >
                {isPending ? t("rejectRidePending") : t("rejectRide")}
              </ActionButton>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
