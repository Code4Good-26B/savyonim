"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, Users, Mail, CheckCircle, BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const baseNavItems = [
  { href: "/representative/dashboard", label: "ניטור חי", icon: Activity },
  { href: "/representative/requests", label: "בקשות נסיעה", icon: ClipboardList },
  { href: "/representative/drivers", label: "נהגים", icon: Users },
  { href: "/representative/statistics", label: "סטטיסטיקות", icon: BarChart3 },
];

const approverOnlyItems = [
  { href: "/representative/invitations", label: "הזמנות", icon: Mail },
  { href: "/representative/approvals", label: "אישורים", icon: CheckCircle },
];

export function RepNav({
  canApproveDrivers = false,
  pendingRides = 0,
  onNavigate,
}: {
  canApproveDrivers?: boolean;
  pendingRides?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const navItems = canApproveDrivers ? [...baseNavItems, ...approverOnlyItems] : baseNavItems;

  return (
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href);
        const showBadge = item.href === "/representative/requests" && pendingRides > 0;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-3", isActive && "bg-secondary")}
            >
              <Icon className="h-5 w-5" />
              {item.label}
              {showBadge && (
                <span className="mr-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {pendingRides > 9 ? "9+" : pendingRides}
                </span>
              )}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}
