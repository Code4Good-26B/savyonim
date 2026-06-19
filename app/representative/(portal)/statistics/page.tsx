import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  Star,
  Users,
  Car,
  ListChecks,
  Zap,
  XCircle,
} from "lucide-react";

type MyStatsRow = {
  total_assigned: string;
  completed: string;
  active: string;
  rejected: string;
  this_month: string;
  this_month_completed: string;
};

type GlobalStatsRow = {
  pending_requests: string;
  active_drivers: string;
  total_drivers: string;
};

export default async function RepStatisticsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;

  let repUserId: string | null = null;
  if (token) {
    const adminClient = createSupabaseClient();
    const {
      data: { user },
    } = await adminClient.auth.getUser(token);
    repUserId = user?.id ?? null;
  }

  const [myStatsResult, globalStatsResult] = await Promise.all([
    repUserId
      ? query<MyStatsRow>(
          `
          SELECT
            count(*)::text AS total_assigned,
            count(*) FILTER (WHERE status = 'completed')::text AS completed,
            count(*) FILTER (WHERE status IN ('assigned', 'in_progress'))::text AS active,
            count(*) FILTER (WHERE status = 'rejected')::text AS rejected,
            count(*) FILTER (
              WHERE created_at >= date_trunc('month', now())
            )::text AS this_month,
            count(*) FILTER (
              WHERE status = 'completed' AND created_at >= date_trunc('month', now())
            )::text AS this_month_completed
          FROM public.rides
          WHERE representative_user_id = $1
        `,
          [repUserId],
        )
      : Promise.resolve({ rows: [] as MyStatsRow[] }),
    query<GlobalStatsRow>(`
      SELECT
        (SELECT count(*) FROM public.ride_requests WHERE status = 'pending')::text AS pending_requests,
        (SELECT count(*) FROM public.drivers d JOIN public.users u ON u.id = d.user_id WHERE u.is_active = true)::text AS active_drivers,
        (SELECT count(*) FROM public.drivers)::text AS total_drivers
    `),
  ]);

  const my = myStatsResult.rows[0] ?? {
    total_assigned: "0",
    completed: "0",
    active: "0",
    rejected: "0",
    this_month: "0",
    this_month_completed: "0",
  };
  const global = globalStatsResult.rows[0] ?? {
    pending_requests: "0",
    active_drivers: "0",
    total_drivers: "0",
  };

  const totalAssigned = Number(my.total_assigned);
  const completed = Number(my.completed);
  const completionRate =
    totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

  const thisMonth = Number(my.this_month);
  const thisMonthCompleted = Number(my.this_month_completed);
  const monthlyRate =
    thisMonth > 0 ? Math.round((thisMonthCompleted / thisMonth) * 100) : 0;

  const myCards = [
    { label: "שיבוצים שביצעתי (סה\"כ)", value: my.total_assigned, icon: ListChecks, color: "text-blue-500" },
    { label: "הושלמו (סה\"כ)", value: my.completed, icon: CheckCircle2, color: "text-green-500" },
    { label: "אחוז השלמה", value: `${completionRate}%`, icon: Star, color: "text-yellow-500" },
    { label: "פעילות החודש", value: my.this_month, icon: Zap, color: "text-purple-500" },
    { label: "הושלמו החודש", value: my.this_month_completed, icon: CheckCircle2, color: "text-green-500" },
    { label: "אחוז השלמה החודש", value: `${monthlyRate}%`, icon: Star, color: "text-yellow-500" },
    { label: "הסעות פעילות כעת", value: my.active, icon: Car, color: "text-blue-500" },
    { label: "בוטלו (סה\"כ)", value: my.rejected, icon: XCircle, color: "text-red-500" },
  ];

  const globalCards = [
    { label: "בקשות ממתינות", value: global.pending_requests, icon: Clock, color: "text-orange-500" },
    { label: "נהגים פעילים", value: `${global.active_drivers} / ${global.total_drivers}`, icon: Users, color: "text-green-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2>הסטטיסטיקות שלי</h2>
        <p className="text-muted-foreground mt-1">פעילות שיבוצים אישית ומצב המערכת</p>
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          הפעילות שלי
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {myCards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {c.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{c.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          מצב המערכת
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {globalCards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {c.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${c.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{c.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
