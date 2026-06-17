import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { accountLifecycleRedirect } from "@/lib/auth/account-lifecycle";
import { AdminNav } from "./AdminNav";
import { AdminMobileNav } from "./AdminMobileNav";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-admin-token")?.value;
  if (!token) redirect("/admin/login");

  const adminClient = createSupabaseClient();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) redirect("/admin/login");

  const result = await query<{ role: string; status: string; is_active: boolean; full_name: string }>(
    "SELECT role, status, is_active, full_name FROM public.users WHERE id = $1",
    [user.id],
  );
  const dbUser = result.rows[0];
  if (!dbUser || dbUser.role !== "admin") redirect("/admin/login");
  if (dbUser.status !== "approved") redirect(accountLifecycleRedirect(dbUser.status) ?? "/admin/login");
  if (!dbUser.is_active) redirect("/admin/login");

  return (
    <>
      <div className="flex h-screen bg-background" dir="rtl">
        {/* Desktop sidebar — first in DOM so it sits on the RIGHT under RTL */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-l border-border bg-card">
          <div className="p-6 border-b border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/savyonim-logo.webp" alt="עמותת סביונים" className="h-14 w-auto mb-3" />
            <h1 className="font-semibold">פורטל מנהל על</h1>
            <p className="text-sm text-muted-foreground mt-1">מנהל עמותה</p>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <AdminNav />
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">{dbUser.full_name}</span>
            <LogoutButton />
          </div>
        </aside>

        <AdminMobileNav />

        <main className="flex-1 overflow-auto pt-16 md:pt-0">
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
      <Toaster position="top-center" richColors />
    </>
  );
}
