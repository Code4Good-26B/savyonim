import Link from "next/link";

// All dispatcher pages read live data via the Supabase service-role client,
// which only has its env vars at runtime. Force dynamic rendering for the
// whole segment so Next never tries to prerender these pages at build time.
export const dynamic = "force-dynamic";

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="p-5 border-b border-gray-200">
          <p className="text-xs uppercase tracking-widest text-gray-400">סביונים</p>
          <p className="mt-1 font-semibold text-gray-800">דיספצ׳ר</p>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          <Link
            href="/dispatcher/dashboard"
            className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            דשבורד
          </Link>
          <Link
            href="/dispatcher/requests"
            className="rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            בקשות נסיעה
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
