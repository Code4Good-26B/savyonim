"use client";

import { useDriverRides } from "@/components/driver/useDriverRides";
import { FutureRideCard, EmptyNotice } from "@/components/driver/RideCards";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { Button } from "@/components/ui/button";

function fmt(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

export default function FutureRidesPage() {
  const { rides, isLoading, error, reload } = useDriverRides();

  return (
    <div className="space-y-6">
      <div>
        <h2>הסעות עתידיות</h2>
        <p className="text-muted-foreground mt-1">ההסעות שכבר שובצו אליך והממתינות לביצוע.</p>
      </div>

      {error ? (
        <DriverNotice title="שגיאה בטעינה" kind="error">
          {error}
          <Button variant="destructive" size="sm" className="mt-3" onClick={reload}>
            נסה שוב
          </Button>
        </DriverNotice>
      ) : isLoading || !rides ? (
        <DriverNotice title="טוען">טוען הסעות עתידיות...</DriverNotice>
      ) : rides.assignedRides.length > 0 ? (
        <div className="space-y-4">
          {rides.assignedRides.map((r) => {
            const req = r.ride_request;
            return (
              <FutureRideCard
                key={r.id}
                ride={{
                  id: r.id,
                  passenger: req?.passenger?.full_name ?? req?.caller_full_name ?? "—",
                  phone: req?.passenger?.phone ?? req?.caller_phone ?? null,
                  pickup: req?.source_address ?? "—",
                  dropoff: req?.destination_address ?? "—",
                  time: fmt(req?.requested_pickup_at),
                  status: r.status,
                }}
              />
            );
          })}
        </div>
      ) : (
        <EmptyNotice>אין לך הסעות עתידיות משובצות כרגע</EmptyNotice>
      )}
    </div>
  );
}
