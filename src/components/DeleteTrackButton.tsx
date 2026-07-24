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
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700"
      title="Delete track"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
