import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { accountLifecycleRedirect } from "@/lib/auth/account-lifecycle";
import { RepNav } from "./RepNav";
import { RepMobileNav } from "./RepMobileNav";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function RepresentativeLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) redirect("/");

  const adminClient = createSupabaseClient();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) redirect("/");

  const [result, pendingResult] = await Promise.all([
    query<{ role: string; status: string; is_active: boolean; full_name: string }>(
      "SELECT role, status, is_active, full_name FROM public.users WHERE id = $1",
      [user.id],
    ),
    query<{ count: string }>("SELECT count(*)::text FROM public.ride_requests WHERE status = 'pending'"),
  ]);
  const dbUser = result.rows[0];
  if (!dbUser || !["admin", "representative"].includes(dbUser.role)) {
    redirect("/representative/login");
  }
  if (dbUser.status !== "approved") {
    redirect(accountLifecycleRedirect(dbUser.status) ?? "/representative/login");
  }
  if (!dbUser.is_active) {
    redirect("/representative/login");
  }

  const permissionsResult = await query<{ can_approve_drivers: boolean }>(
    "SELECT can_approve_drivers FROM public.users WHERE id = $1",
    [user.id],
  );
  const canApproveDrivers = dbUser.role === "admin" || permissionsResult.rows[0]?.can_approve_drivers === true;
  const pendingRides = parseInt(pendingResult.rows[0]?.count ?? "0", 10);

  return (
    <>
      <div className="flex h-screen bg-background" dir="rtl">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-l border-border bg-card">
          <div className="p-6 border-b border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/savyonim-logo.webp" alt="עמותת סביונים" className="h-14 w-auto mb-3" />
            <h1 className="font-semibold">מרכז שיגור הסעות</h1>
            <p className="text-sm text-muted-foreground mt-1">פורטל נציגים</p>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <RepNav canApproveDrivers={canApproveDrivers} pendingRides={pendingRides} />
          </div>

          <div className="p-4 border-t border-border flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">{dbUser.full_name}</span>
            <LogoutButton />
          </div>
        </aside>

        <RepMobileNav canApproveDrivers={canApproveDrivers} pendingRides={pendingRides} />

        <main className="flex-1 overflow-auto pt-16 md:pt-0">
          <div className="p-6 md:p-8">{children}</div>
        </main>
      </div>
      <Toaster position="top-center" richColors />
    </>
  );
}
