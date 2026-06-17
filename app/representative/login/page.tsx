"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { loginRepresentative } from "@/lib/representative/api";
import { storeRepresentativeSession } from "@/lib/representative/session";
import type { RepresentativeApiError } from "@/lib/representative/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function RepresentativeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const session = await loginRepresentative(email, password);
      storeRepresentativeSession(session);
      router.replace("/representative/dashboard");
    } catch (caught) {
      const apiError = caught as RepresentativeApiError;
      if (apiError.redirectTo) {
        router.replace(apiError.redirectTo);
        return;
      }
      setError(apiError.detail ?? "שגיאה בהתחברות");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/savyonim-logo.webp" alt="עמותת סביונים" className="h-24 w-auto mx-auto" />
          <div>
            <h1 className="text-2xl font-semibold">ברוכים הבאים</h1>
            <p className="text-muted-foreground">כניסה לפורטל הנציגים</p>
          </div>
        </div>

        <Card className="border-2">
          <CardContent className="p-6">
            {error && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  dir="ltr"
                  autoComplete="email"
                  placeholder="name@savyonim.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  dir="ltr"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" disabled={isPending} className="w-full h-11 gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {isPending ? "מתחבר..." : "התחבר"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 עמותת סביונים. כל הזכויות שמורות.
        </p>
      </div>
    </div>
  );
}
