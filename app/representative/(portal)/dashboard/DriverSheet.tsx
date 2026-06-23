"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Phone, Car } from "lucide-react";
import type { DashboardDriver } from "./DashboardClient";

const STATUS_LABEL: Record<DashboardDriver["status"], string> = {
  available: "זמין",
  busy: "בהסעה",
  inactive: "לא פעיל",
};

const STATUS_VARIANT: Record<DashboardDriver["status"], "default" | "secondary" | "outline"> = {
  available: "default",
  busy: "secondary",
  inactive: "outline",
};

export function DriverSheet({
  driver,
  onClose,
}: {
  driver: DashboardDriver | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={driver !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="left" dir="rtl">
        {driver && (
          <>
            <SheetHeader className="text-right">
              <SheetTitle>{driver.name}</SheetTitle>
              <SheetDescription>פרטי נהג</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">סטטוס</span>
                <Badge variant={STATUS_VARIANT[driver.status]}>
                  {STATUS_LABEL[driver.status]}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">טלפון</span>
                <div className="flex items-center gap-1.5 text-sm" dir="ltr">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {driver.phone ?? "—"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">הסעות שהושלמו</span>
                <div className="flex items-center gap-1.5 text-sm">
                  <Car className="h-3.5 w-3.5 text-muted-foreground" />
                  {driver.totalRides}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
