"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RepNav } from "./RepNav";

export function RepMobileNav({ canApproveDrivers, pendingRides }: { canApproveDrivers: boolean; pendingRides: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-card border-b border-border z-10">
      <div className="flex items-center justify-between p-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="תפריט">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <SheetTitle className="sr-only">תפריט ניווט</SheetTitle>
            <div className="mt-6 px-2">
              <RepNav canApproveDrivers={canApproveDrivers} pendingRides={pendingRides} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <h1 className="font-semibold">פורטל נציגים</h1>
      </div>
    </div>
  );
}
