import { query } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Mail, XCircle, Car, CheckCircle2, Ban } from "lucide-react";

type EventRow = {
  event_time: string;
  event_type: string;
  actor: string | null;
  subject: string | null;
  detail: string | null;
};

const EVENT_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  invitation_sent: {
    label: "הזמנה נשלחה",
    icon: Mail,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  user_joined: {
    label: "הצטרף למערכת",
    icon: UserPlus,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  invitation_revoked: {
    label: "הזמנה בוטלה",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  ride_assigned: {
    label: "נהג שובץ",
    icon: Car,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
  },
  ride_completed: {
    label: "הסעה הושלמה",
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  ride_rejected: {
    label: "הסעה בוטלה",
    icon: Ban,
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
};

const ROLE_LABEL: Record<string, string> = {
  driver: "נהג",
  representative: "נציג",
  admin: "מנהל",
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AuditPage() {
  const result = await query<EventRow>(`
    SELECT event_time, event_type, actor, subject, detail
    FROM (
      -- Invitation sent
      SELECT
        i.created_at AS event_time,
        'invitation_sent' AS event_type,
        u.full_name AS actor,
        i.email AS subject,
        i.invited_role::text AS detail
      FROM public.invitations i
      LEFT JOIN public.users u ON u.id = i.invited_by

      UNION ALL

      -- User joined (accepted invite)
      SELECT
        i.accepted_at AS event_time,
        'user_joined' AS event_type,
        pu.full_name AS actor,
        i.email AS subject,
        i.invited_role::text AS detail
      FROM public.invitations i
      LEFT JOIN public.users pu ON pu.id = i.auth_user_id
      WHERE i.accepted_at IS NOT NULL AND i.status = 'accepted'

      UNION ALL

      -- Invitation revoked
      SELECT
        i.updated_at AS event_time,
        'invitation_revoked' AS event_type,
        NULL AS actor,
        i.email AS subject,
        i.invited_role::text AS detail
      FROM public.invitations i
      WHERE i.status = 'revoked'

      UNION ALL

      -- Ride assigned
      SELECT
        r.assigned_at AS event_time,
        'ride_assigned' AS event_type,
        rep.full_name AS actor,
        rr.caller_full_name AS subject,
        drv.full_name AS detail
      FROM public.rides r
      JOIN public.ride_requests rr ON rr.id = r.ride_request_id
      LEFT JOIN public.users rep ON rep.id = r.representative_user_id
      JOIN public.drivers d ON d.id = r.driver_id
      JOIN public.users drv ON drv.id = d.user_id

      UNION ALL

      -- Ride completed
      SELECT
        r.completed_at AS event_time,
        'ride_completed' AS event_type,
        drv.full_name AS actor,
        rr.caller_full_name AS subject,
        NULL AS detail
      FROM public.rides r
      JOIN public.ride_requests rr ON rr.id = r.ride_request_id
      JOIN public.drivers d ON d.id = r.driver_id
      JOIN public.users drv ON drv.id = d.user_id
      WHERE r.completed_at IS NOT NULL

      UNION ALL

      -- Ride rejected / cancelled
      SELECT
        r.rejected_at AS event_time,
        'ride_rejected' AS event_type,
        drv.full_name AS actor,
        rr.caller_full_name AS subject,
        r.rejection_reason AS detail
      FROM public.rides r
      JOIN public.ride_requests rr ON rr.id = r.ride_request_id
      JOIN public.drivers d ON d.id = r.driver_id
      JOIN public.users drv ON drv.id = d.user_id
      WHERE r.rejected_at IS NOT NULL
    ) events
    WHERE event_time IS NOT NULL
    ORDER BY event_time DESC
    LIMIT 200
  `);

  const events = result.rows;

  return (
    <div className="space-y-6">
      <div>
        <h2>לוג ביקורת</h2>
        <p className="text-muted-foreground mt-1">
          היסטוריית פעולות המערכת — הזמנות, שיבוצים, והסעות (200 אחרונות)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ציר זמן אירועים</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">אין אירועים עדיין</p>
          ) : (
            <div className="divide-y divide-border">
              {events.map((ev, idx) => {
                const cfg = EVENT_CONFIG[ev.event_type] ?? {
                  label: ev.event_type,
                  icon: Mail,
                  color: "text-muted-foreground",
                  bgColor: "bg-muted",
                };
                const Icon = cfg.icon;

                return (
                  <div key={idx} className="flex items-start gap-4 px-6 py-4" dir="rtl">
                    {/* Icon */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cfg.bgColor}`}
                    >
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs text-muted-foreground shrink-0" dir="ltr">
                          {formatDateTime(ev.event_time)}
                        </span>
                      </div>

                      {/* Subject */}
                      {ev.subject && (
                        <p className="mt-0.5 text-sm text-foreground truncate">
                          {ev.event_type === "ride_assigned" ||
                          ev.event_type === "ride_completed" ||
                          ev.event_type === "ride_rejected"
                            ? `נוסע: ${ev.subject}`
                            : ev.subject}
                        </p>
                      )}

                      {/* Actor + detail */}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ev.actor && (
                          <span>
                            {ev.event_type === "ride_assigned"
                              ? `נציג: ${ev.actor}`
                              : ev.event_type === "ride_completed" || ev.event_type === "ride_rejected"
                                ? `נהג: ${ev.actor}`
                                : `בוצע על ידי: ${ev.actor}`}
                          </span>
                        )}
                        {ev.detail && ev.event_type === "ride_assigned" && (
                          <span>{ev.actor ? " · " : ""}נהג: {ev.detail}</span>
                        )}
                        {ev.detail && ev.event_type === "ride_rejected" && (
                          <span>{ev.actor ? " · " : ""}סיבה: {ev.detail}</span>
                        )}
                        {ev.detail &&
                          (ev.event_type === "invitation_sent" ||
                            ev.event_type === "user_joined" ||
                            ev.event_type === "invitation_revoked") && (
                            <span>
                              {ev.actor ? " · " : ""}תפקיד: {ROLE_LABEL[ev.detail] ?? ev.detail}
                            </span>
                          )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
