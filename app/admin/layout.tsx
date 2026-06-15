import { Toaster } from "sonner";
import { SidebarNav } from "./SidebarNav";

export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex min-h-screen bg-gray-50">
        <aside className="w-64 shrink-0 bg-slate-900 flex flex-col">
          <div className="px-5 py-5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-900 text-xs font-bold shrink-0">
                ס
              </div>
              <div>
                <p className="text-sm font-semibold text-white">סביונים</p>
                <p className="text-xs text-slate-400">פאנל ניהול</p>
              </div>
            </div>
          </div>

          <div className="flex-1 py-2">
            <SidebarNav />
          </div>

          <div className="px-5 py-4 border-t border-slate-800">
            <p className="text-xs text-slate-500">גרסה 1.0 — MVP</p>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
      <Toaster position="top-center" richColors />
    </>
  );
}
