import { createSupabaseClient } from "@/lib/supabase";

const DRIVER_FIELDS = "id, user_id, contact_phone, service_zone_id, is_active";

export async function POST(request: Request) {
  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email) return Response.json({ error: "email is required" }, { status: 400 });
  if (!password) return Response.json({ error: "password is required" }, { status: 400 });

  const supabase = createSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return Response.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, full_name, role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (userError || !user || user.role !== "driver" || !user.is_active) {
    return Response.json({ error: "This account is not an active driver" }, { status: 403 });
  }

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select(DRIVER_FIELDS)
    .eq("user_id", user.id)
    .single();

  if (driverError || !driver || !driver.is_active) {
    return Response.json({ error: "No active driver profile exists for this account" }, { status: 403 });
  }

  return Response.json({
    userId: user.id,
    driverId: driver.id,
    fullName: user.full_name,
    email,
    role: "driver",
    serviceZoneId: driver.service_zone_id,
  });
}
