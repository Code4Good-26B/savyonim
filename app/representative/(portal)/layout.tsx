import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { createSupabaseClient } from "@/lib/supabase";
import { query } from "@/lib/db";
import { accountLifecycleRedirect } from "@/lib/auth/account-lifecycle";
import { RepNav } from "./RepNav";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function RepresentativeLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("savionim-rep-token")?.value;
  if (!token) redirect("/representative/login");

  const adminClient = createSupabaseClient();
  const { data: { user }, error } = await adminClient.auth.getUser(token);
  if (error || !user) redirect("/representative/login");

  const result = await query<{ role: string; status: string; is_active: boolean; full_name: string }>(
    "SELECT role, status, is_active, full_name FROM public.users WHERE id = $1",
    [user.id],
  );
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

  return (
    <>
      <div className="min-h-screen bg-background" dir="rtl">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/savyonim-logo.webp" alt="עמותת סביונים" className="h-11 w-auto" />
                <div>
                  <h1 className="font-semibold">מרכז שיגור הסעות</h1>
                  <p className="text-sm text-muted-foreground">פורטל נציגים</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <RepNav />
                <div className="flex items-center gap-3 border-r border-border pr-4">
                  <span className="text-sm text-muted-foreground">{dbUser.full_name}</span>
                  <LogoutButton />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-6">{children}</main>
      </div>
      <Toaster position="top-center" richColors />
    </>
  );
}
