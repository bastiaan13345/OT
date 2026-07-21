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
          "bg-brand-500/10 text-brand-400": variant === "default",
          "bg-green-500/10 text-green-400": variant === "success",
          "bg-yellow-500/10 text-yellow-400": variant === "warning",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
