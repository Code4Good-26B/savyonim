"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Users, Building2, CheckCircle, Mail } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/statistics", label: "סטטיסטיקות", icon: BarChart3 },
  { href: "/admin/rides", label: "נסיעות", icon: ClipboardList },
  { href: "/admin/drivers", label: "נהגים", icon: Users },
  { href: "/admin/representatives", label: "נציגים", icon: Building2 },
  { href: "/admin/approvals", label: "אישורים", icon: CheckCircle },
  { href: "/admin/invitations", label: "הזמנות", icon: Mail },
];

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn("w-full justify-start gap-3", isActive && "bg-secondary")}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}
