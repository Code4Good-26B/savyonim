import { createSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json();
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : null;
  const serviceZoneId =
    typeof body.serviceZoneId === "string" && body.serviceZoneId.trim()
      ? body.serviceZoneId.trim()
      : null;

  if (!fullName) return Response.json({ error: "fullName is required" }, { status: 400 });
  if (!email) return Response.json({ error: "email is required" }, { status: 400 });
  if (password.length < 8) {
    return Response.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const supabase = createSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        app_role: "driver",
        full_name: fullName,
      },
    },
  });

  if (authError || !authData.user) {
    return Response.json(
      { error: authError?.message ?? "Could not create auth user" },
      { status: 400 },
    );
  }

  const { error: userError } = await supabase.from("users").insert({
    id: authData.user.id,
    full_name: fullName,
    phone,
    role: "driver",
    is_active: true,
  });

  if (userError) {
    return Response.json({ error: userError.message }, { status: userError.code === "23505" ? 409 : 400 });
  }

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .insert({
      user_id: authData.user.id,
      contact_phone: phone,
      service_zone_id: serviceZoneId,
      is_active: true,
    })
    .select("id, service_zone_id")
    .single();

  if (driverError || !driver) {
    return Response.json(
      { error: driverError?.message ?? "Could not create driver profile" },
      { status: driverError?.code === "23505" ? 409 : 400 },
    );
  }

  return Response.json(
    {
      userId: authData.user.id,
      driverId: driver.id,
      fullName,
      email,
      role: "driver",
      serviceZoneId: driver.service_zone_id,
    },
    { status: 201 },
  );
}
