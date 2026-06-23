import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { InviteForm } from "./InviteForm";
import type { InvitationRow } from "./actions";
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

const STATUS_LABEL: Record<string, string> = {
  pending: "ממתין",
  accepted: "התקבל",
  expired: "פג תוקף",
  revoked: "בוטל",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  accepted: "bg-green-50 text-green-700 border-green-100",
  expired: "bg-muted text-muted-foreground border-transparent",
  revoked: "bg-red-50 text-red-700 border-red-100",
};

const ROLE_LABEL: Record<string, string> = {
  representative: "נציג",
  driver: "נהג",
  admin: "מנהל",
};

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) return null;

  const adminClient = createSupabaseClient();
  const {
    data: { user },
  } = await adminClient.auth.getUser(token);
  if (!user) return null;

  const result = await query<{ role: string; full_name: string; can_approve_drivers: boolean }>(
    `SELECT role, full_name, can_approve_drivers FROM public.users WHERE id = $1`,
    [user.id],
  );

  return result.rows[0] ?? null;
}

async function getInvitations(userId: string): Promise<InvitationRow[]> {
  const result = await query<InvitationRow>(
    `SELECT id, email, invited_role, status, created_at
     FROM public.invitations
     WHERE invited_by = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId],
  );
  return result.rows;
}

export default async function InvitationsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <div className="space-y-6">
        <h2>הזמנות</h2>
        <p className="text-sm text-destructive">אין הרשאה לצפייה בדף זה.</p>
      </div>
    );
  }

  const isAdmin = currentUser.role === "admin";
  const canSendInvites = isAdmin || (currentUser.role === "representative" && currentUser.can_approve_drivers);

  if (!canSendInvites) {
    return (
      <div className="space-y-6">
        <div>
          <h2>הזמנות</h2>
          <p className="text-muted-foreground mt-1">הזמנת נהגים למערכת</p>
        </div>
        <Card>
          <CardContent className="p-10 text-center">
            <p className="text-sm text-muted-foreground">אין לך הרשאה לשלוח הזמנות.</p>
            <p className="mt-1 text-xs text-muted-foreground">פנה למנהל המערכת לקבלת גישה.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const adminClient = createSupabaseClient();
  const { data: { user } } = await adminClient.auth.getUser(token!);
  const invitations = user ? await getInvitations(user.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2>הזמנות</h2>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? "שלח הזמנות לנציגים ולנהגים" : "שלח הזמנות לנהגים חדשים"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <InviteForm canInviteRepresentative={isAdmin} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">הזמנות שנשלחו</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">לא נשלחו הזמנות עדיין</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">אימייל</TableHead>
                    <TableHead className="text-right">תפקיד</TableHead>
                    <TableHead className="text-right">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-right" dir="ltr">{inv.email}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {ROLE_LABEL[inv.invited_role] ?? inv.invited_role}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={STATUS_COLOR[inv.status] ?? "bg-muted text-muted-foreground"}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
