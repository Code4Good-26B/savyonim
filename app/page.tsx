"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { loginRepresentative } from "@/lib/representative/api";
import { storeRepresentativeSession } from "@/lib/representative/session";
import { loginDriver } from "@/lib/driver/api";
import { storeDriverSession } from "@/lib/driver/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Role = "representative" | "admin" | "driver";

export default function LandingLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("representative");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      if (role === "admin") {
        const res = await fetch("/api/auth/login-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? "שגיאה בהתחברות");
          return;
        }
        router.replace("/admin/statistics");
      } else if (role === "representative") {
        const session = await loginRepresentative(email, password);
        storeRepresentativeSession(session);
        router.replace("/representative/dashboard");
      } else {
        const session = await loginDriver(email, password);
        storeDriverSession(session);
        router.replace("/driver/dashboard");
      }
    } catch (caught) {
      const apiError = caught as { detail?: string };
      setError(apiError?.detail ?? "שגיאה בהתחברות");
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
            <p className="text-muted-foreground">התחברו כדי להמשיך למערכת ניהול ההסעות</p>
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
              <div className="grid gap-2">
                <Label htmlFor="role">תפקיד</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="representative">נציג</SelectItem>
                    <SelectItem value="admin">מנהל</SelectItem>
                    <SelectItem value="driver">נהג</SelectItem>
                  </SelectContent>
                </Select>
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
