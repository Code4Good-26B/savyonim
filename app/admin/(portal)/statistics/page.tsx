import { ListChecks, CheckCircle2, Clock, Star, Users, Building2, Zap, XCircle } from "lucide-react";
import { query } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyChart } from "./MonthlyChart";

type StatsRow = {
  total_requests: string;
  completed: string;
  pending: string;
  in_progress: string;
  rejected: string;
  active_drivers: string;
  total_drivers: string;
  active_reps: string;
  total_reps: string;
};

type MonthRow = { month: string; count: string };

export default async function StatisticsPage() {
  const [statsResult, monthlyResult] = await Promise.all([
    query<StatsRow>(`
      SELECT
        (SELECT count(*) FROM public.ride_requests
          WHERE created_at >= date_trunc('month', now()))::text AS total_requests,
        (SELECT count(*) FROM public.ride_requests
          WHERE status = 'completed'
          AND created_at >= date_trunc('month', now()))::text AS completed,
        (SELECT count(*) FROM public.ride_requests
          WHERE status = 'pending'
          AND created_at >= date_trunc('month', now()))::text AS pending,
        (SELECT count(*) FROM public.ride_requests
          WHERE status = 'in_progress')::text AS in_progress,
        (SELECT count(*) FROM public.ride_requests
          WHERE status = 'rejected'
          AND created_at >= date_trunc('month', now()))::text AS rejected,
        (SELECT count(*) FROM public.drivers WHERE is_active = true)::text AS active_drivers,
        (SELECT count(*) FROM public.drivers)::text AS total_drivers,
        (SELECT count(*) FROM public.users WHERE role = 'representative' AND is_active = true)::text AS active_reps,
        (SELECT count(*) FROM public.users WHERE role = 'representative')::text AS total_reps
    `),
    query<MonthRow>(`
      SELECT
        to_char(date_trunc('month', created_at), 'MM/YYYY') AS month,
        count(*)::text AS count
      FROM public.ride_requests
      WHERE created_at >= now() - interval '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at) DESC
    `),
  ]);

  const s = statsResult.rows[0];
  const monthly = monthlyResult.rows
    .map((r) => ({ month: r.month, count: Number(r.count) }))
    .reverse();

  const completionRate =
    Number(s.total_requests) > 0
      ? Math.round((Number(s.completed) / Number(s.total_requests)) * 100)
      : 0;

  const statCards = [
    { label: "בקשות החודש", value: s.total_requests, icon: ListChecks },
    { label: "הושלמו החודש", value: s.completed, icon: CheckCircle2 },
    { label: "ממתינות לטיפול", value: s.pending, icon: Clock },
    { label: "אחוז השלמה", value: `${completionRate}%`, icon: Star },
    { label: "נהגים פעילים", value: `${s.active_drivers} / ${s.total_drivers}`, icon: Users },
    { label: "נציגים פעילים", value: `${s.active_reps} / ${s.total_reps}`, icon: Building2 },
    { label: "נסיעות בביצוע", value: s.in_progress, icon: Zap },
    { label: "נדחו החודש", value: s.rejected, icon: XCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2>סטטיסטיקות</h2>
        <p className="text-muted-foreground mt-1">סיכום פעילות המערכת</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{c.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>בקשות נסיעה — 6 חודשים אחרונים</CardTitle>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">אין נתונים</p>
          ) : (
            <MonthlyChart data={monthly} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
