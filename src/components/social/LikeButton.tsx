"use client";

import { useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleLike } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  trackId: string;
  liked: boolean;
  count: number;
}

export function LikeButton({ trackId, liked, count }: LikeButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => toggleLike(trackId))}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50",
        liked
          ? "border-ink bg-ink text-canvas hover:opacity-80"
          : "border-line bg-canvas text-ink hover:bg-soft"
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      {count}
    </button>
  );
}
