"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { revokeInvitation, resendInvitation } from "./actions";

export function InviteActions({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeInvitation(invitationId);
      if ("ok" in result) {
        toast.success("ההזמנה בוטלה");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleResend() {
    startTransition(async () => {
      const result = await resendInvitation(invitationId);
      if ("ok" in result) {
        toast.success("הזמנה נשלחה שוב");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleResend}
        disabled={isPending}
        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
      >
        שלח שוב
      </button>
      <button
        onClick={handleRevoke}
        disabled={isPending}
        className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        בטל
      </button>
    </div>
  );
}
