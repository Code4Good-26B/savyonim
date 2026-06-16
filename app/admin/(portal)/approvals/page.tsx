import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { AdminApprovalList, type PendingUser } from "./ApprovalList";

type PendingRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
  national_id: string | null;
  birth_year: number | null;
  gender: string | null;
  location: string | null;
  license_type: string | null;
  license_issue_year: number | null;
  consent_criminal_record: boolean | null;
  owns_vehicle_ambulatory: boolean | null;
  license_photo_path: string | null;
};

export default async function AdminApprovalsPage() {
  const adminClient = createSupabaseClient();

  const result = await query<PendingRow>(`
    SELECT
      u.id           AS user_id,
      u.full_name,
      u.email,
      u.role,
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
    LEFT JOIN public.drivers d ON d.user_id = u.id
    WHERE u.status = 'pending'
      AND u.role IN ('driver', 'representative')
    ORDER BY u.role DESC, u.created_at ASC
  `);

  const users: PendingUser[] = await Promise.all(
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

  const total = users.length;

  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div>
        <h2>אישור הרשמות</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {total > 0 ? `${total} בקשות ממתינות לאישור` : "אין בקשות ממתינות"}
        </p>
      </div>

      <AdminApprovalList initialUsers={users} />
    </div>
  );
}
