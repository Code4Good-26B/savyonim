"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/savyonim-logo.webp" alt="עמותת סביונים" className="h-20 w-auto mx-auto" />

        <div className="space-y-2">
          <p className="text-7xl font-bold text-brand leading-none">404</p>
          <h1 className="text-2xl font-semibold text-foreground">הדף לא נמצא</h1>
          <p className="text-muted-foreground">
            מצטערים, הדף שחיפשת אינו קיים, הוסר או שהקישור שגוי.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              חזרה לדף הבית
            </Link>
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => router.back()}>
            <ArrowRight className="h-4 w-4" />
            חזרה אחורה
          </Button>
        </div>
      </div>
    </div>
  );
}
