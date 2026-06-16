import Link from "next/link";
import { Clock, MapPin, Plus, Circle } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  approved: "מאושר",
  waiting_for_representative: "ממתין לנציג",
  in_progress: "בדרך",
  completed: "הושלם",
  rejected: "נדחה",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  approved: "bg-blue-50 text-blue-700 border-blue-100",
  waiting_for_representative: "bg-purple-50 text-purple-700 border-purple-100",
  in_progress: "bg-cyan-50 text-cyan-700 border-cyan-100",
  completed: "bg-green-50 text-green-700 border-green-100",
  rejected: "bg-red-50 text-red-700 border-red-100",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-amber-500",
  approved: "bg-blue-500",
  waiting_for_representative: "bg-purple-500",
  in_progress: "bg-cyan-500",
  completed: "bg-green-500",
  rejected: "bg-red-500",
};

const DRIVER_STATUS = {
  in_progress: {
    label: "בנסיעה",
    className: "bg-cyan-50 text-cyan-700 border-cyan-100",
    dot: "fill-cyan-500 text-cyan-500",
  },
  assigned: {
    label: "ממתין לאיסוף",
    className: "bg-amber-50 text-amber-700 border-amber-100",
    dot: "fill-amber-500 text-amber-500",
  },
  available: {
    label: "פנוי",
    className: "bg-green-50 text-green-700 border-green-100",
    dot: "fill-green-500 text-green-500",
  },
  inactive: {
    label: "לא פעיל",
    className: "bg-gray-100 text-gray-500 border-transparent",
    dot: "fill-gray-400 text-gray-400",
  },
} as const;

type RideRequestRow = {
  id: string;
  status: string;
  source_address: string;
  destination_address: string;
  requested_pickup_at: string | null;
  caller_full_name: string | null;
};

type DriverRow = {
  id: string;
  full_name: string;
  contact_phone: string | null;
  is_active: boolean;
  ride_status: "assigned" | "in_progress" | null;
};

function getDriverStatus(row: DriverRow) {
  if (!row.is_active) return DRIVER_STATUS.inactive;
  if (row.ride_status === "in_progress") return DRIVER_STATUS.in_progress;
  if (row.ride_status === "assigned") return DRIVER_STATUS.assigned;
  return DRIVER_STATUS.available;
}

function formatPickup(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DispatcherDashboard() {
  const supabase = createSupabaseClient();

  const [
    { count: total },
    { count: pending },
    { count: inProgress },
    { count: completed },
    { data: recentRides },
    driversResult,
  ] = await Promise.all([
    supabase.from("ride_requests").select("*", { count: "exact", head: true }),
    supabase.from("ride_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("ride_requests").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("ride_requests").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase
      .from("ride_requests")
      .select("id, status, source_address, destination_address, requested_pickup_at, caller_full_name")
      .order("requested_pickup_at", { ascending: false })
      .limit(10),
    query<DriverRow>(`
      SELECT
        d.id,
        u.full_name,
        d.contact_phone,
        d.is_active,
        r.status AS ride_status
      FROM public.drivers d
      JOIN public.users u ON u.id = d.user_id
      LEFT JOIN public.rides r
        ON r.driver_id = d.id
        AND r.status IN ('assigned', 'in_progress')
      ORDER BY
        CASE WHEN d.is_active THEN 0 ELSE 1 END,
        u.full_name
    `),
  ]);

  const allRides = (recentRides ?? []) as RideRequestRow[];
  const drivers = driversResult.rows;

  const stats = [
    {
      label: "סה״כ בקשות",
      value: total ?? 0,
      icon: (
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      label: "ממתינות לטיפול",
      value: pending ?? 0,
      icon: (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "בביצוע כעת",
      value: inProgress ?? 0,
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      label: "הושלמו",
      value: completed ?? 0,
      icon: (
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-8" dir="rtl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">דשבורד</h1>
          <p className="mt-1 text-sm text-gray-400">סקירה כללית של מצב הנסיעות</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/representative/requests/new">
            <Plus className="h-4 w-4" />
            בקשה חדשה
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 font-medium">{s.label}</span>
              {s.icon}
            </div>
            <p className="text-3xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Available drivers — appears on the right under RTL */}
        <div className="space-y-6">
          <div>
            <h3 className="text-gray-900">נהגים</h3>
            <p className="mt-1 text-sm text-muted-foreground">מצב הנהגים בזמן אמת</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-gray-900">סטטוס נהגים</CardTitle>
            </CardHeader>
            <CardContent>
              {drivers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  אין נהגים רשומים במערכת
                </p>
              ) : (
                <ScrollArea className="h-[600px] pl-4">
                  <div className="space-y-4">
                    {drivers.map((driver) => {
                      const status = getDriverStatus(driver);
                      return (
                        <div
                          key={driver.id}
                          className="space-y-2 border-b border-border pb-4 last:border-b-0 last:pb-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-right text-sm font-medium text-gray-900">
                                  {driver.full_name}
                                </p>
                                <p
                                  className="text-right text-xs text-muted-foreground tabular-nums"
                                  dir="ltr"
                                >
                                  {driver.contact_phone ?? "—"}
                                </p>
                              </div>
                              <Circle className={`h-2 w-2 ${status.dot}`} />
                            </div>
                            <Badge variant="outline" className={`text-xs ${status.className}`}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live ride monitoring — appears on the left under RTL */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-gray-900">ניטור נסיעות</h2>
              <p className="mt-1 text-muted-foreground">מעקב אחר בקשות הנסיעה האחרונות</p>
            </div>
            <Link href="/representative/requests" className="text-xs text-blue-600 hover:underline">
              כל הבקשות ←
            </Link>
          </div>

          {allRides.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-sm text-muted-foreground">אין בקשות נסיעה עדיין</p>
                <Link
                  href="/representative/requests/new"
                  className="mt-2 inline-block text-xs text-blue-600 hover:underline"
                >
                  צור בקשה ראשונה ←
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {allRides.map((ride) => (
                <Card key={ride.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${STATUS_DOT[ride.status] ?? "bg-gray-400"}`}
                        />
                        <div className="text-right">
                          <CardTitle className="text-base text-gray-900">
                            {ride.caller_full_name ?? "—"}
                          </CardTitle>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={STATUS_COLOR[ride.status] ?? "bg-gray-100 text-gray-600 border-transparent"}
                      >
                        {STATUS_LABEL[ride.status] ?? ride.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
                        <div className="flex-1 text-right">
                          <p className="text-sm font-medium text-gray-900">מוצא</p>
                          <p className="text-sm text-muted-foreground">{ride.source_address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-red-600" />
                        <div className="flex-1 text-right">
                          <p className="text-sm font-medium text-gray-900">יעד</p>
                          <p className="text-sm text-muted-foreground">{ride.destination_address}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-border pt-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/representative/request/${ride.id}`}>פרטים</Link>
                      </Button>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>{formatPickup(ride.requested_pickup_at)}</span>
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
