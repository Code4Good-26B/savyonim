"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendAdminInvite } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type InvitableRole = "representative" | "driver";

export function AdminInviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("driver");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await sendAdminInvite(email, role);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`הזמנה נשלחה לכתובת ${email}`);
        setEmail("");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">שליחת הזמנה</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="admin-invite-email">כתובת אימייל</Label>
            <Input
              id="admin-invite-email"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              disabled={isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="admin-invite-role">תפקיד</Label>
            <Select value={role} onValueChange={(v) => setRole(v as InvitableRole)} disabled={isPending}>
              <SelectTrigger id="admin-invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">נהג</SelectItem>
                <SelectItem value="representative">נציג</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isPending ? "שולח..." : "שלח הזמנה"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
