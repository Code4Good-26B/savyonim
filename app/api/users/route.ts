import { supabaseErrorResponse } from "@/lib/api-errors";
import { requireBearerAuth } from "@/lib/api-auth";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = requireBearerAuth(request);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: 401 });
  }

  const supabase = createSupabaseClient(auth.token);
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, phone, role, is_active")
    .order("full_name");

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}
