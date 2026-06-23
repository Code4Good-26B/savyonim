import Link from "next/link";
import { Users, UserCheck, Activity, CircleDot, UserPlus } from "lucide-react";
import { query } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DriverRow = {
  id: string;
  full_name: string;
  email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  ride_status: "assigned" | "in_progress" | null;
};

const STATUS_CONFIG = {
  in_progress: { label: "בנסיעה", className: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  assigned: { label: "ממתין לאיסוף", className: "bg-amber-50 text-amber-700 border-amber-100" },
  available: { label: "פנוי", className: "bg-green-50 text-green-700 border-green-100" },
  inactive: { label: "לא פעיל", className: "bg-muted text-muted-foreground border-transparent" },
} as const;

function getDriverStatus(row: DriverRow) {
  if (!row.is_active) return STATUS_CONFIG.inactive;
  if (row.ride_status === "in_progress") return STATUS_CONFIG.in_progress;
  if (row.ride_status === "assigned") return STATUS_CONFIG.assigned;
  return STATUS_CONFIG.available;
}

export default async function DriversPage() {
  const result = await query<DriverRow>(`
    SELECT
      d.id,
      u.full_name,
      u.email,
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
  `);

  const drivers = result.rows;

  const counts = {
    total: drivers.length,
    active: drivers.filter((d) => d.is_active).length,
    busy: drivers.filter((d) => d.ride_status !== null).length,
    available: drivers.filter((d) => d.is_active && d.ride_status === null).length,
  };

  const statCards = [
    { label: "סה״כ נהגים", value: counts.total, icon: Users },
    { label: "פעילים", value: counts.active, icon: UserCheck },
    { label: "בנסיעה / ממתין", value: counts.busy, icon: Activity },
    { label: "פנויים", value: counts.available, icon: CircleDot },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>ניהול נהגים</h2>
          <p className="text-muted-foreground mt-1">מצב כלל הנהגים הרשומים במערכת</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/representative/invitations">
            <UserPlus className="h-4 w-4" />
            הוסף נהג
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>נהגים רשומים ({drivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם נהג</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">אימייל</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-12">
                    אין נהגים רשומים במערכת
                  </TableCell>
                </TableRow>
              ) : (
                drivers.map((driver) => {
                  const status = getDriverStatus(driver);
                  return (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium text-right">{driver.full_name}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums" dir="ltr">{driver.contact_phone ?? "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground" dir="ltr">{driver.email ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={status.className}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
