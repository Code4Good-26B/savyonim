import { createSupabaseClient } from "@/lib/supabase";
import NewRequestForm from "./NewRequestForm";

export default async function NewRequestPage() {
  const supabase = createSupabaseClient();
  const { data: zones } = await supabase
    .from("service_zones")
    .select("id, name, region_code")
    .order("name");

  return <NewRequestForm zones={zones ?? []} />;
}
