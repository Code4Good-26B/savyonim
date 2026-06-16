"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Clock, MapPin, User, Phone, Plus, Circle } from "lucide-react";

export type DashboardDriver = {
  id: string;
  name: string;
  phone: string | null;
  status: "available" | "busy" | "inactive";
  totalRides: number;
};

export type DashboardRide = {
  id: string;
  passenger: string | null;
  phone: string | null;
  pickup: string;
  dropoff: string;
  driver: string | null;
  status: string;
  requestedTime: string | null;
};

const RIDE_STATUS_DOT: Record<string, string> = {
  pending: "bg-orange-500",
  approved: "bg-blue-500",
  waiting_for_representative: "bg-purple-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  rejected: "bg-red-500",
};

const RIDE_STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  approved: "מאושר",
  waiting_for_representative: "ממתין לנציג",
  in_progress: "בביצוע",
  completed: "הושלם",
  rejected: "נדחה",
};

export function DashboardClient({
  drivers,
  rides,
}: {
  drivers: DashboardDriver[];
  rides: DashboardRide[];
}) {
  const router = useRouter();
  const [isCreateRideOpen, setIsCreateRideOpen] = useState(false);
  const [wantsReturnRide, setWantsReturnRide] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Available Drivers - Takes up 1 column; appears on the RIGHT under RTL */}
      <div className="space-y-6">
        <div>
          <h3>נהגים זמינים</h3>
          <p className="text-sm text-muted-foreground mt-1">מתנדבים מחוברים כעת</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">סטטוס נהגים</CardTitle>
          </CardHeader>
          <CardContent>
            {drivers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                אין נהגים רשומים במערכת
              </p>
            ) : (
              <ScrollArea className="h-[600px] pl-4">
                <div className="space-y-4">
                  {drivers.map((driver, index) => (
                    <div key={driver.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium text-right">{driver.name}</p>
                            <p className="text-xs text-muted-foreground text-right" dir="ltr">
                              {driver.phone ?? "—"}
                            </p>
                          </div>
                          <Circle
                            className={`h-2 w-2 ${
                              driver.status === "available"
                                ? "fill-green-500 text-green-500"
                                : driver.status === "busy"
                                  ? "fill-yellow-500 text-yellow-500"
                                  : "fill-gray-400 text-gray-400"
                            }`}
                          />
                        </div>
                        <Badge
                          variant={driver.status === "available" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {driver.status === "available"
                            ? "זמין"
                            : driver.status === "busy"
                              ? "בהסעה"
                              : "לא פעיל"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground pr-4 text-right">
                        {driver.totalRides} הסעות שהושלמו
                      </div>
                      {index !== drivers.length - 1 && (
                        <div className="border-b border-border pt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Ride Monitoring - Takes up 2 columns; appears on the LEFT under RTL */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2>ניטור הסעות בזמן אמת</h2>
            <p className="text-muted-foreground mt-1">עקוב אחר כל ההסעות הפעילות והממתינות</p>
          </div>
          <Dialog open={isCreateRideOpen} onOpenChange={setIsCreateRideOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                צור הסעה
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>צור בקשת הסעה חדשה</DialogTitle>
                <DialogDescription>הזן ידנית בקשת הסעה חדשה</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="passenger-name">שם הנוסע</Label>
                  <Input id="passenger-name" placeholder="הזן שם נוסע" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="passenger-phone">טלפון נוסע</Label>
                  <Input id="passenger-phone" type="tel" placeholder="050-1234567" dir="ltr" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pickup-address">כתובת איסוף</Label>
                  <Input id="pickup-address" placeholder="הזן מיקום איסוף" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dropoff-address">כתובת יעד</Label>
                  <Input id="dropoff-address" placeholder="הזן יעד" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="requested-time">שעת בקשה</Label>
                  <Input id="requested-time" type="time" />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="return-ride" className="cursor-pointer">נסיעה חזרה (הלוך ושוב)</Label>
                  <Switch id="return-ride" checked={wantsReturnRide} onCheckedChange={setWantsReturnRide} />
                </div>
                {wantsReturnRide && (
                  <div className="grid gap-2">
                    <Label htmlFor="wait-time">זמן המתנה ביעד (דקות)</Label>
                    <Input id="wait-time" type="number" placeholder="לדוגמה: 45" />
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="notes">הוראות מיוחדות (אופציונלי)</Label>
                  <Textarea id="notes" placeholder="דרישות או הערות מיוחדות..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateRideOpen(false)}>ביטול</Button>
                <Button
                  onClick={() => {
                    setIsCreateRideOpen(false);
                    router.push("/representative/requests/new");
                  }}
                >
                  המשך לטופס המלא
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {rides.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                אין בקשות נסיעה עדיין
              </CardContent>
            </Card>
          ) : (
            rides.map((ride) => (
              <Card key={ride.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${RIDE_STATUS_DOT[ride.status] ?? "bg-gray-500"}`}
                      />
                      <div className="text-right">
                        <CardTitle className="text-base">{ride.passenger ?? "—"}</CardTitle>
                        {ride.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <span dir="ltr">{ride.phone}</span>
                            <Phone className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant={ride.status === "pending" ? "secondary" : "default"}>
                      {RIDE_STATUS_LABEL[ride.status] ?? ride.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="flex-1 text-right">
                        <p className="text-sm font-medium">איסוף</p>
                        <p className="text-sm text-muted-foreground">{ride.pickup}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-red-600 mt-0.5" />
                      <div className="flex-1 text-right">
                        <p className="text-sm font-medium">יעד</p>
                        <p className="text-sm text-muted-foreground">{ride.dropoff}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-2 text-sm">
                      {ride.driver ? (
                        <>
                          <span>
                            <span className="font-medium">נהג:</span> {ride.driver}
                          </span>
                          <User className="h-4 w-4" />
                        </>
                      ) : (
                        <span className="text-muted-foreground">לא שובץ נהג</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>{ride.requestedTime ?? "—"}</span>
                      <Clock className="h-4 w-4" />
                    </div>
                  </div>
                  {ride.status === "pending" && (
                    <Button asChild className="w-full" size="sm">
                      <a href={`/representative/request/${ride.id}`}>שבץ נהג</a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
