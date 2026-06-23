"use server";

import { cookies } from "next/headers";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";

export async function assignDriverToRide(
  rideRequestId: string,
  driverId: string,
): Promise<{ ok: true } | { error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) return { error: "לא מחובר" };

  const adminClient = createSupabaseClient();
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) return { error: "פג תוקף ההתחברות" };

  const ambulanceResult = await query<{ id: string }>(
    `SELECT id FROM public.ambulances
     WHERE is_available = true AND is_active = true
       AND id NOT IN (
         SELECT ambulance_id FROM public.rides WHERE status IN ('assigned', 'in_progress')
       )
     LIMIT 1`,
  );

  const ambulance = ambulanceResult.rows[0];
  if (!ambulance) return { error: "אין אמבולנס פנוי כרגע" };

  try {
    await query(
      `INSERT INTO public.rides
         (ride_request_id, driver_id, ambulance_id, representative_user_id, status)
       VALUES ($1, $2, $3, $4, 'assigned')`,
      [rideRequestId, driverId, ambulance.id, user.id],
    );
  } catch (err) {
    const pgErr = err as { code?: string; message?: string };
    if (pgErr.code === "23505") return { error: "ההסעה כבר שובצה" };
    return { error: pgErr.message ?? "שגיאה בשיבוץ" };
  }

  return { ok: true };
}
