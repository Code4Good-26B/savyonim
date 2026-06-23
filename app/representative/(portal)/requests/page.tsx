import Link from "next/link";
import { Plus } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase";
import { type RideDriver, assignedDriver } from "./assigned-driver";
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
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

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

const STATUS_FILTERS = [
  { label: "הכל", value: "" },
  { label: "ממתין", value: "pending" },
  { label: "מאושר", value: "approved" },
  { label: "בדרך", value: "in_progress" },
  { label: "הושלם", value: "completed" },
  { label: "נדחה", value: "rejected" },
];

type RideRequestRow = {
  id: string;
  status: string;
  source_address: string;
  destination_address: string;
  requested_pickup_at: string | null;
  caller_full_name: string | null;
  caller_phone: string | null;
  rides: RideDriver[];
};

function buildUrl(params: Record<string, string>) {
  const filtered = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ""));
  const qs = new URLSearchParams(filtered).toString();
  return `/representative/requests${qs ? `?${qs}` : ""}`;
}

export default async function RequestsPage(props: { searchParams: Promise<Record<string, string>> }) {
  const searchParams = (await props.searchParams) as Record<string, string>;
  const activeStatus = searchParams?.status ?? "";
  const page = Math.max(1, parseInt(searchParams?.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = createSupabaseClient();

  let q = supabase
    .from("ride_requests")
    .select(
      "id, status, source_address, destination_address, requested_pickup_at, caller_full_name, caller_phone, rides(status, drivers(users(full_name)))",
      { count: "exact" },
    )
    .order("requested_pickup_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (activeStatus) q = q.eq("status", activeStatus);

  const ridesResult = await q;

  const rides = (ridesResult.data ?? []) as RideRequestRow[];
  const totalCount = ridesResult.count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const error = ridesResult.error;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2>בקשות נסיעה</h2>
          <p className="text-muted-foreground mt-1">
            {totalCount > 0 ? `${totalCount} בקשות סה״כ` : "ניהול ומעקב אחר בקשות הנסיעה"}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/representative/requests/new">
            <Plus className="h-4 w-4" />
            בקשה חדשה
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={buildUrl({ status: f.value, page: "1" })}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeStatus === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          שגיאה בטעינת הבקשות: {error.message}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>כל הבקשות ({rides.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">שם מתקשר</TableHead>
                <TableHead className="text-right">טלפון</TableHead>
                <TableHead className="text-right">מוצא</TableHead>
                <TableHead className="text-right">יעד</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">נהג משויך</TableHead>
                <TableHead className="text-right">זמן איסוף</TableHead>
                <TableHead className="text-right"><span className="sr-only">פעולות</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rides.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    <p>אין בקשות נסיעה התואמות את הסינון</p>
                    <Link href="/representative/requests/new" className="mt-2 inline-block text-sm text-primary hover:underline">
                      צור בקשה חדשה →
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                rides.map((ride) => (
                  <TableRow key={ride.id}>
                    <TableCell className="font-medium text-right">{ride.caller_full_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums" dir="ltr">{ride.caller_phone ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground max-w-[160px] truncate">{ride.source_address}</TableCell>
                    <TableCell className="text-right text-muted-foreground max-w-[160px] truncate">{ride.destination_address}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={STATUS_COLOR[ride.status] ?? "bg-muted text-muted-foreground"}>
                        {STATUS_LABEL[ride.status] ?? ride.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{assignedDriver(ride.rides)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {ride.requested_pickup_at
                        ? new Date(ride.requested_pickup_at).toLocaleString("he-IL", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-left">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/representative/request/${ride.id}`}>פרטים</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
              <p className="text-xs text-muted-foreground">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} מתוך {totalCount}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildUrl({ status: activeStatus, page: String(page - 1) })}>← הקודם</Link>
                  </Button>
                )}
                {page < totalPages && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={buildUrl({ status: activeStatus, page: String(page + 1) })}>הבא →</Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
