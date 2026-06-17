"use client";

import { useDriverRides } from "@/components/driver/useDriverRides";
import { OpenRideCard, EmptyNotice } from "@/components/driver/RideCards";
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

export default function OpenRidesPage() {
  const { rides, isLoading, error, reload } = useDriverRides();

  return (
    <div className="space-y-6">
      <div>
        <h2>הסעות פתוחות</h2>
        <p className="text-muted-foreground mt-1">
          הסעות שעדיין לא נלקחו על ידי אף נהג. בחר הסעה כדי לצפות בפרטים ולקבל אותה.
        </p>
      </div>

      {error ? (
        <DriverNotice title="שגיאה בטעינה" kind="error">
          {error}
          <Button variant="destructive" size="sm" className="mt-3" onClick={reload}>
            נסה שוב
          </Button>
        </DriverNotice>
      ) : isLoading || !rides ? (
        <DriverNotice title="טוען">טוען הסעות פתוחות...</DriverNotice>
      ) : rides.openRides.length > 0 ? (
        <div className="space-y-4">
          {rides.openRides.map((r) => (
            <OpenRideCard
              key={r.id}
              ride={{
                id: r.id,
                passenger: r.passenger?.full_name ?? r.caller_full_name ?? "—",
                phone: r.passenger?.phone ?? r.caller_phone ?? null,
                pickup: r.source_address,
                dropoff: r.destination_address,
                time: fmt(r.requested_pickup_at),
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyNotice>אין כרגע הסעות פתוחות לקבלה</EmptyNotice>
      )}
    </div>
  );
}
