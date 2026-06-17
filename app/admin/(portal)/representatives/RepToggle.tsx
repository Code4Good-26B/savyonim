"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setCanApproveDrives } from "./actions";

export function RepToggle({ userId, value }: { userId: string; value: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    startTransition(async () => {
      const result = await setCanApproveDrives(userId, next);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(next ? "הרשאה הופעלה" : "הרשאה בוטלה");
      }
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={() => handleChange(!value)}
      className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        value
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-red-100 text-red-700 hover:bg-red-200"
      }`}
    >
      {isPending ? "..." : value ? "מאושר" : "לא מאושר"}
    </button>
  );
}
