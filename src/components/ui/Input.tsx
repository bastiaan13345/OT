"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-lg border border-line bg-canvas px-4 py-2.5 text-sm text-ink placeholder:text-faint transition-colors focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
