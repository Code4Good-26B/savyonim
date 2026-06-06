import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "slate" | "blue" | "amber" | "emerald" | "red";

const tones: Record<BadgeTone, string> = {
  slate: "border-slate-200 bg-slate-100 text-slate-700",
  blue: "border-blue-200 bg-blue-50 text-blue-800",
  amber: "border-amber-200 bg-amber-50 text-amber-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
  red: "border-red-200 bg-red-50 text-red-800",
};

export function Badge({
  className,
  tone = "slate",
  ...props
}: ComponentPropsWithoutRef<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}
