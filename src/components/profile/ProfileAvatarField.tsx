"use client";

import Image from "next/image";
import { useState } from "react";
import { Camera, UserRound, X } from "lucide-react";

export function ProfileAvatarField({ currentUrl }: { currentUrl?: string | null }) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  return (
    <div>
      <label className="mb-3 block text-sm font-semibold text-ink">Profile picture</label>
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative h-28 w-28 overflow-hidden rounded-full border border-line bg-soft">
          {preview ? <Image src={preview} alt="Profile preview" fill sizes="112px" className="object-cover" unoptimized={preview.startsWith("blob:")} /> : <div className="flex h-full items-center justify-center"><UserRound className="h-10 w-10 text-faint" /></div>}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink has-[:focus-visible]:ring-offset-2">
            <Camera className="h-4 w-4" /> Choose image
            <input
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setPreview(URL.createObjectURL(file));
                setRemoveAvatar(false);
              }}
            />
          </label>
          {preview && <button type="button" onClick={() => { setPreview(null); setRemoveAvatar(true); }} className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-muted transition hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"><X className="h-4 w-4" /> Remove</button>}
        </div>
      </div>
      <input type="hidden" name="removeAvatar" value={removeAvatar ? "true" : "false"} />
      <p className="mt-3 text-xs text-muted">JPG, PNG, WebP or AVIF up to 10 MB. A square image works best.</p>
    </div>
  );
}
