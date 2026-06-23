"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { assignDriverToRide } from "../actions";
import type { DashboardDriver } from "./DashboardClient";

export function QuickAssign({
  rideId,
  availableDrivers,
}: {
  rideId: string;
  availableDrivers: DashboardDriver[];
}) {
  const router = useRouter();
  const [driverId, setDriverId] = useState("");
  const [isPending, startTransition] = useTransition();

  if (availableDrivers.length === 0) {
    return <p className="text-xs text-muted-foreground">אין נהגים פנויים</p>;
  }

  function handleAssign() {
    if (!driverId) {
      toast.error("בחר נהג לשיבוץ");
      return;
    }
    startTransition(async () => {
      const result = await assignDriverToRide(rideId, driverId);
      if ("ok" in result) {
        toast.success("הנהג שובץ בהצלחה");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <select
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
        disabled={isPending}
        className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-right"
        dir="rtl"
      >
        <option value="">בחר נהג...</option>
        {availableDrivers.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <Button size="sm" onClick={handleAssign} disabled={isPending || !driverId}>
        {isPending ? "..." : "שבץ"}
      </Button>
    </div>
  );
}
