"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, AlertCircle, X, Disc3 } from "lucide-react";
import {
  createRelease,
  deleteRelease,
  assignTrackToRelease,
  removeTrackFromRelease,
} from "@/lib/actions";
import { Input } from "@/components/ui/Input";
import type { ReleaseType } from "./types";

interface PickableTrack {
  id: string;
  title: string;
  artist: string;
}

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>, done?: () => void) => {
    setError(null);
    start(async () => {
      try {
        await fn();
        done?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  };
  return { pending, error, run };
}

const TYPES: { value: ReleaseType; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "ep", label: "EP" },
  { value: "album", label: "Album" },
];

/** Collapsible "new release" form. */
export function CreateReleaseForm() {
  const { pending, error, run } = useAction();
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    run(() => createRelease(fd), () => setOpen(false));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
      >
        <Plus className="h-4 w-4" /> New release
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-line bg-white p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
          <Disc3 className="h-5 w-5 text-ink" /> New release
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-ink">
            Title <span className="text-red-700">*</span>
          </label>
          <Input name="title" placeholder="Release title" required />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">
            Type
          </label>
          <select
            name="type"
            defaultValue="single"
            className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink">
            Release date
          </label>
          <Input name="releaseDate" type="date" />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-ink">
            Description
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Liner notes, concept, credits…"
            className="w-full resize-none rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
          />
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3 text-sm text-muted">
        <input
          type="checkbox"
          name="published"
          value="draft"
          className="h-4 w-4 rounded border-line bg-white accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        />
        Save as draft (unpublished)
      </label>

      {error && (
        <p role="alert" className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create release
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export function DeleteReleaseButton({
  releaseId,
  title,
}: {
  releaseId: string;
  title: string;
}) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete release "${title}"? Tracks are not deleted.`)) {
          run(() => deleteRelease(releaseId));
        }
      }}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-50"
      title="Delete release"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}

export function RemoveTrackButton({
  releaseId,
  trackId,
}: {
  releaseId: string;
  trackId: string;
}) {
  const { pending, run } = useAction();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(() => removeTrackFromRelease(releaseId, trackId))}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:opacity-50"
      title="Remove from release"
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

/** Dropdown to assign one of the creator's unassigned tracks to a release. */
export function AssignTrackControl({
  releaseId,
  options,
}: {
  releaseId: string;
  options: PickableTrack[];
}) {
  const { pending, error, run } = useAction();
  const [value, setValue] = useState("");

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted">
        All your tracks are already in this release.
      </p>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/15"
        >
          <option value="">Add a track…</option>
          {options.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} — {t.artist}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !value}
          onClick={() =>
            run(() => assignTrackToRelease(releaseId, value), () => setValue(""))
          }
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}
    </div>
  );
}
