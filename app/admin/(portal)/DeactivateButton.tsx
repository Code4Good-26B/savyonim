"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { toggleUserActive } from "./actions";

export function DeactivateButton({
  userId,
  isActive,
  pathToRevalidate,
}: {
  userId: string;
  isActive: boolean;
  pathToRevalidate: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleUserActive(userId, !isActive, pathToRevalidate);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(isActive ? "המשתמש הושבת" : "המשתמש הופעל");
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        isActive
          ? "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-700"
          : "bg-green-100 text-green-700 hover:bg-green-200"
      }`}
    >
      {isPending ? "..." : isActive ? "השבת" : "הפעל"}
    </button>
  );
}
