"use client";

import { useDriverRides } from "@/components/driver/useDriverRides";
import { HistoryRideCard, EmptyNotice } from "@/components/driver/RideCards";
import { DriverNotice } from "@/components/driver/DriverNotice";
import { Button } from "@/components/ui/button";

function fmtDateTime(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return `${d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" })} · ${d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function DriverRideHistoryPage() {
  const { rides, isLoading, error, reload } = useDriverRides();

  return (
    <div className="space-y-6">
      <div>
        <h2>היסטוריית הסעות</h2>
        <p className="text-muted-foreground mt-1">כל ההסעות שביצעת או שבוטלו.</p>
      </div>

      {error ? (
        <DriverNotice title="שגיאה בטעינה" kind="error">
          {error}
          <Button variant="destructive" size="sm" className="mt-3" onClick={reload}>
            נסה שוב
          </Button>
        </DriverNotice>
      ) : isLoading || !rides ? (
        <DriverNotice title="טוען">טוען היסטוריית הסעות...</DriverNotice>
      ) : rides.rideHistory.length > 0 ? (
        <div className="space-y-4">
          {rides.rideHistory.map((r) => {
            const req = r.ride_request;
            const date = fmtDateTime(r.completed_at ?? r.rejected_at ?? r.assigned_at);
            const distance =
              r.odometer_start_km != null && r.odometer_end_km != null
                ? `${(r.odometer_end_km - r.odometer_start_km).toFixed(0)} ק״מ`
                : null;
            const meta = [date, distance].filter(Boolean).join(" · ");
            return (
              <HistoryRideCard
                key={r.id}
                ride={{
                  id: r.id,
                  passenger: req?.passenger?.full_name ?? req?.caller_full_name ?? "—",
                  meta,
                  pickup: req?.source_address ?? "—",
                  dropoff: req?.destination_address ?? "—",
                  completed: r.status === "completed",
                }}
              />
            );
          })}
        </div>
      ) : (
        <EmptyNotice>עדיין לא ביצעת הסעות</EmptyNotice>
      )}
    </div>
  );
}
