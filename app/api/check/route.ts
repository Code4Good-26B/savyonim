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

  // Initialize the Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch data from the 'notes' table created in step 1
  const { data, error } = await supabase.from("notes").select("*");

  // Handle database connection or query errors
  if (error) {
    return Response.json(
      {
        status: "Fetch error",
        message: error.message,
      },
      { status: 500 },
    );
  }

  // Return success status and the retrieved data
  return Response.json({
    status: "Vercel and Supabase connection is successful!",
    results: data,
  });
}