"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-soft text-ink": variant === "default",
          "bg-emerald-100 text-emerald-900": variant === "success",
          "bg-amber-100 text-amber-900": variant === "warning",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
