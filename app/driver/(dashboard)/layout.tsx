"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Inbox, CalendarClock, History, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { clearDriverSession, getStoredDriverSession } from "@/lib/driver/session";
import type { DriverSession } from "@/lib/driver/types";

const navItems = [
  { to: "/driver", label: "הסעות פתוחות", icon: Inbox, end: true },
  { to: "/driver/future", label: "הסעות עתידיות", icon: CalendarClock, end: false },
  { to: "/driver/history", label: "היסטוריית הסעות", icon: History, end: false },
];

export default function DriverDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<DriverSession | null>(null);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSession(getStoredDriverSession());
      setHasCheckedSession(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hasCheckedSession && (!session || session.role !== "driver")) {
      router.replace("/");
    }
  }, [hasCheckedSession, session, router]);

  function handleLogout() {
    clearDriverSession();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Driver header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/savyonim-logo.webp" alt="עמותת סביונים" className="h-11 w-auto" />
              <div>
                <h1 className="font-semibold">אזור הנהג</h1>
                <p className="text-sm text-muted-foreground">שלום, {session?.fullName ?? ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                זמין
              </Badge>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="יציאה"
                title="יציאה"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Navigation menu */}
          <nav className="mt-4 flex flex-wrap items-center gap-1 -mb-px">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  href={item.to}
                  className={cn(
                    "flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 py-6">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
