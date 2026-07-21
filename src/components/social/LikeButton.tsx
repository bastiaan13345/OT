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
        "inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50",
        liked
          ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15"
          : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
      )}
    >
      <Heart className={cn("h-4 w-4", liked && "fill-current")} />
      {count}
    </button>
  );
}
