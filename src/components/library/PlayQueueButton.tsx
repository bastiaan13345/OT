"use client";

import { Play } from "lucide-react";
import type { Track } from "@prisma/client";
import { usePlayer } from "@/components/providers/PlayerProvider";
import { Button } from "@/components/ui/Button";

type PlayQueueButtonProps = {
  tracks: Track[];
  label?: string;
  source: string;
  variant?: "primary" | "secondary" | "ghost";
};

export function PlayQueueButton({
  tracks,
  label = "Play all",
  source,
  variant = "primary",
}: PlayQueueButtonProps) {
  const { playQueue } = usePlayer();

  return (
    <Button
      type="button"
      variant={variant}
      disabled={!tracks.length}
      onClick={() => playQueue(tracks, { source: { label: source }, startIndex: 0 })}
    >
      <Play className="h-4 w-4 fill-current" />
      {label}
    </Button>
  );
}
