import { Toaster } from "sonner";
import { SidebarNav } from "./SidebarNav";

// All dispatcher pages read live data via the Supabase service-role client,
// which only has its env vars at runtime. Force dynamic rendering for the
// whole segment so Next never tries to prerender these pages at build time.
export const dynamic = "force-dynamic";

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-60 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold shrink-0">
              ס
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">סביונים</p>
              <p className="text-xs text-gray-400">פורטל נציגים</p>
            </div>
          </div>
        </div>

        <div className="flex-1 py-2">
          <SidebarNav />
        </div>

        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">גרסה 1.0 — MVP</p>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
    <Toaster position="top-center" richColors />
    </>
  );
}
