import Image from "next/image";
import {
  Disc3,
  Music2,
  Calendar,
  ListMusic,
} from "lucide-react";
import { getReleases, getOwnedTracks } from "@/components/creator/data";
import { formatDuration } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import {
  CreateReleaseForm,
  DeleteReleaseButton,
  AssignTrackControl,
  RemoveTrackButton,
} from "@/components/creator/ReleaseControls";

const TYPE_LABEL: Record<string, string> = {
  single: "Single",
  ep: "EP",
  album: "Album",
};

export default async function ReleasesPage() {
  const [releases, allTracks] = await Promise.all([getReleases(), getOwnedTracks()]);
  // Per-release assignable options: exclude only tracks already in THAT release,
  // so a track can appear in multiple releases (correct schema behaviour).
  // Previously a single global exclusion list was used, which incorrectly hid
  // tracks already in any release from all other releases' pickers.

  return (
    <div className="px-4 py-8 sm:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-soft">
          <Disc3 className="h-6 w-6 text-ink" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-ink">Releases</h1>
          <p className="mt-1 text-muted">
            Group tracks into singles, EPs, and albums with artwork, dates, and ordering.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-xl border border-line bg-panel p-6">
            <h2 className="mb-4 text-lg font-semibold text-ink">New release</h2>
            <CreateReleaseForm />
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {releases.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-line bg-panel py-20 text-center">
              <div className="mb-4 rounded-full bg-soft p-6">
                <Disc3 className="h-12 w-12 text-faint" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-ink">No releases yet</h3>
              <p className="text-muted">Create your first single, EP, or album to start organizing tracks.</p>
            </div>
          ) : (
            releases.map((release) => (
              <div key={release.id} className="overflow-hidden rounded-xl border border-line bg-canvas">
                <div className="flex items-start gap-4 border-b border-line p-5">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-soft">
                    {release.coverUrl ? (
                      <Image src={release.coverUrl} alt={release.title} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Disc3 className="h-7 w-7 text-faint" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-ink">{release.title}</h3>
                      <Badge>{TYPE_LABEL[release.type] ?? release.type}</Badge>
                      {!release.published && <Badge variant="warning">Draft</Badge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {release.releaseDate
                          ? release.releaseDate.toLocaleDateString()
                          : "No date set"}
                      </span>
                      <span className="flex items-center gap-1">
                        <ListMusic className="h-3.5 w-3.5" />
                        {release.tracks.length} track{release.tracks.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {release.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted">{release.description}</p>
                    )}
                  </div>
                  <DeleteReleaseButton releaseId={release.id} title={release.title} />
                </div>

                {/* Track membership */}
                <div className="p-5">
                  {release.tracks.length === 0 ? (
                    <p className="mb-3 text-sm text-muted">No tracks added yet.</p>
                  ) : (
                    <ol className="mb-3 flex flex-col divide-y divide-line">
                      {release.tracks.map((t, i) => (
                        <li key={t.id} className="flex items-center gap-3 py-2">
                          <span className="w-5 text-sm text-muted">{i + 1}</span>
                          <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded bg-soft">
                            {t.coverUrl ? (
                              <Image src={t.coverUrl} alt={t.title} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Music2 className="h-3.5 w-3.5 text-faint" />
                              </div>
                            )}
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.title}</span>
                          {t.duration ? (
                            <span className="text-xs text-muted">{formatDuration(t.duration)}</span>
                          ) : null}
                          <RemoveTrackButton releaseId={release.id} trackId={t.trackId} />
                        </li>
                      ))}
                    </ol>
                  )}
                  <AssignTrackControl
                    releaseId={release.id}
                    options={allTracks.filter(
                      (t) => !release.tracks.some((rt) => rt.trackId === t.id)
                    )}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
