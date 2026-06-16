import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { SidebarNav } from "./SidebarNav";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function RepresentativeLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) redirect("/representative/login");

  const adminClient = createSupabaseClient();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) redirect("/representative/login");

  const result = await query<{ role: string; is_active: boolean; full_name: string }>(
    "SELECT role, is_active, full_name FROM public.users WHERE id = $1",
    [user.id],
  );
  const dbUser = result.rows[0];
  if (!dbUser?.is_active || !["admin", "representative"].includes(dbUser.role)) {
    redirect("/representative/login");
  }

  return (
    <>
      <div className="flex min-h-screen bg-gray-50" dir="rtl">
        <aside className="w-56 shrink-0 border-l border-gray-100 bg-white flex flex-col">
          <div className="px-4 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold shrink-0">
                ס
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">סביונים</p>
                <p className="text-xs text-gray-400 leading-tight">פורטל נציגים</p>
              </div>
            </div>
          </div>

          <div className="flex-1 py-3">
            <SidebarNav />
          </div>

          <div className="px-4 py-4 border-t border-gray-100 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400 truncate">{dbUser.full_name}</p>
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-5xl">{children}</div>
        </main>
      </div>
      <Toaster position="top-center" richColors />
    </>
  );
}
