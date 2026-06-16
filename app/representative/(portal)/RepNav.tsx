"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ClipboardList, Users, Mail, CheckCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { to: "/representative/dashboard", label: "ניטור חי", icon: Activity, exact: true },
  { to: "/representative/requests", label: "בקשות נסיעה", icon: ClipboardList, exact: false },
  { to: "/representative/drivers", label: "נהגים", icon: Users, exact: false },
  { to: "/representative/invitations", label: "הזמנות", icon: Mail, exact: false },
  { to: "/representative/approvals", label: "אישורים", icon: CheckCircle, exact: false },
];

export function RepNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.to
          : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            href={item.to}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
  );
}
