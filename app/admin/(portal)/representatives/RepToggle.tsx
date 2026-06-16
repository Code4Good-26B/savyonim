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
      role="switch"
      aria-checked={value}
      disabled={isPending}
      onClick={() => handleChange(!value)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        value ? "bg-primary" : "bg-switch-background"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-card shadow transform transition-transform duration-200 ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
