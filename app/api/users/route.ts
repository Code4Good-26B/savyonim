import { supabaseErrorResponse } from "@/lib/api-errors";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name, phone, role, is_active")
    .order("full_name");

  if (error) return supabaseErrorResponse(error);
  return Response.json(data);
}
