"use client";

import { Trash2 } from "lucide-react";
import { deleteTrack } from "@/lib/actions";

export function DeleteTrackButton({ id, title }: { id: string; title: string }) {
  const handleDelete = async () => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await deleteTrack(id);
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
      title="Delete track"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
