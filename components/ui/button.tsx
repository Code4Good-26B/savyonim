import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-blue-700 text-white shadow-sm hover:bg-blue-800 focus-visible:ring-blue-500 disabled:bg-blue-300",
  secondary: "bg-slate-950 text-white shadow-sm hover:bg-slate-800 focus-visible:ring-slate-500 disabled:bg-slate-300",
  outline:
    "border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-blue-300 hover:text-blue-800 focus-visible:ring-blue-500 disabled:text-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-slate-400 disabled:text-slate-400",
  danger: "bg-red-700 text-white shadow-sm hover:bg-red-800 focus-visible:ring-red-500 disabled:bg-red-300",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-10 rounded-md px-3 text-sm",
  md: "min-h-11 rounded-md px-4 text-sm",
  lg: "min-h-12 rounded-md px-5 text-sm",
  icon: "h-11 w-11 rounded-md p-0 text-sm",
};

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ className, variant = "primary", size = "md", ...props }: ButtonLinkProps) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
