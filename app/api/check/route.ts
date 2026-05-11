import { supabaseErrorResponse } from "@/lib/api-errors";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  // Use the exact variable names provided by Vercel integration
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  // Validate that environment variables are loaded correctly
  if (!supabaseUrl || !supabaseKey) {
    return Response.json(
      {
        error: "Missing keys!",
        message: "Check if environment variables are correctly set in your .env.local file",
      },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Query a foundational table from this repository schema instead of the old template 'notes' table.
  const { data, error } = await supabase.from("service_zones").select("id").limit(1);

  if (error) return supabaseErrorResponse(error);

  return Response.json({
    status: "Vercel and Supabase connection is successful!",
    results: data,
  });
}