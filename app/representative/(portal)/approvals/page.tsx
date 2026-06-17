import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { ApprovalList, type PendingDriver } from "./ApprovalList";

type DriverRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  national_id: string | null;
  birth_year: number | null;
  gender: string | null;
  location: string | null;
  license_type: string | null;
  license_issue_year: number | null;
  consent_criminal_record: boolean;
  owns_vehicle_ambulatory: boolean;
  license_photo_path: string | null;
};

export default async function ApprovalsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) redirect("/");

  const adminClient = createSupabaseClient();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) redirect("/");

  const callerResult = await query<{ can_approve_drivers: boolean }>(
    "SELECT can_approve_drivers FROM public.users WHERE id = $1",
    [user.id],
  );
  if (!callerResult.rows[0]?.can_approve_drivers) redirect("/representative/dashboard");

  const result = await query<DriverRow>(`
    SELECT
      u.id         AS user_id,
      u.full_name,
      u.email,
      u.national_id,
      d.birth_year,
      d.gender,
      d.location,
      d.license_type,
      d.license_issue_year,
      d.consent_criminal_record,
      d.owns_vehicle_ambulatory,
      d.license_photo_path
    FROM public.users u
    JOIN public.drivers d ON d.user_id = u.id
    WHERE u.role = 'driver' AND u.status = 'pending'
    ORDER BY u.created_at ASC
  `);

  const drivers: PendingDriver[] = await Promise.all(
    result.rows.map(async (row) => {
      let photo_url: string | null = null;
      if (row.license_photo_path) {
        const { data } = await adminClient.storage
          .from("license-photos")
          .createSignedUrl(row.license_photo_path, 3600);
        photo_url = data?.signedUrl ?? null;
      }
      return { ...row, photo_url };
    }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2>אישור נהגים</h2>
        <p className="text-muted-foreground mt-1">
          {drivers.length > 0
            ? `${drivers.length} בקשות ממתינות לאישור`
            : "אין בקשות ממתינות"}
        </p>
      </div>

      <ApprovalList initialDrivers={drivers} />
    </div>
  );
}
