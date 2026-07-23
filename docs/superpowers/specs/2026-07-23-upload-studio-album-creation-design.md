# Upload Studio and Album Creation Design

## Summary

Replace the current single-track form at `/admin/upload` with one unified upload studio. A segmented control switches between a fast single-track flow and a first-class album-creation flow. Album mode accepts multiple audio files, uses one shared cover, allows drag-and-drop ordering and per-track renaming, and keeps every successfully uploaded track when another track fails.

The redesign also makes prior creator submissions available as reusable metadata suggestions and replaces visually inconsistent native date and checkbox controls with dark, accessible OpenTunes components. Inputs, menus, calendar popovers, track cards, and advanced panels must use the app's existing dark surface or glass styling. White backgrounds are not permitted on these surfaces.

## Goals

- Preserve the speed and behavior of single-track uploads.
- Create a real `Release` and ordered `ReleaseTrack` records during album uploads.
- Store one album cover and reuse its URL across the release and its tracks.
- Let creators rename, reorder, customize, upload, and retry tracks independently.
- Preserve successful tracks if other album tracks fail.
- Suggest reusable values from the creator's previous submissions.
- Make dates and boolean settings visually consistent with OpenTunes.
- Add automated tests and an `npm test` command before implementation behavior is added.

## Non-goals

- Resumable chunked audio transfer.
- Parallel uploads or user-configurable concurrency.
- Editing audio files, trimming, mastering, or waveform manipulation.
- Copying track-specific fields such as a previous title or release date as a full preset.
- Reworking the separate Releases management page beyond ensuring newly created albums appear there correctly.

## User Experience

### Page structure

The page header becomes **Upload studio**, with a short music-focused explanation and a segmented `Single track` / `Create album` mode control. Single mode shows one audio drop zone and the existing metadata flow. Album mode uses a two-column desktop layout and a single-column mobile layout:

- The album panel contains shared artwork, album title, release type, release date, shared defaults, and album-level advanced settings.
- The track workspace contains the multi-file drop zone, ordered track rows, per-row progress, and the final upload action.

The default view stays concise. Optional values live behind an **Advanced settings** disclosure. Album-level values become defaults for each track. A track row exposes a compact **Customize** disclosure for overrides without forcing creators to repeat shared values.

### Audio selection and metadata

Album mode accepts multiple supported audio files from the file picker or a drag operation. Each file becomes a stable client-side row with its own identifier and status. Browser-side `music-metadata` parsing runs independently for every file.

Metadata precedence is:

1. A creator's explicit per-track edit.
2. Embedded audio tags.
3. Filename-derived title and artist.
4. Album-level defaults.
5. Session creator name where an artist is still missing.

Changing an album-level default updates tracks that still inherit that field and does not overwrite a field explicitly customized on a track.

### Ordering and naming

Track rows show a drag handle, automatic track number, editable title, original filename, size, and status. Dragging a row updates visible track numbers and the final `ReleaseTrack.position` values. The same order is used for sequential uploading.

Removing a waiting or failed row removes it locally. An already uploaded row remains saved and attached to the album; the interface must explain that removing it from the pending list does not delete it.

### Shared and per-track settings

Album-level defaults cover artist, genre, release date, license, price, tags, description, download permission, and draft/published state. Each row may override those values through its Customize panel. The resolved values sent for a track are the override when present and the shared default otherwise.

The existing featured-placement setting remains available only where the current role and backend rules allow it. It is visually presented as a switch but does not bypass server-side role enforcement.

### Previous-submission suggestions

Reusable suggestions are derived only from tracks and releases visible within the signed-in creator's ownership scope. Suggestions include:

- Artist
- Genre
- Tags
- License
- Album or project title

Values are trimmed, deduplicated case-insensitively, and ranked by most recent use. Empty values are omitted. Each field initially shows a small recent set, with keyboard-accessible matching as the creator types. Selecting a suggestion fills the field but never locks it.

Track titles, descriptions, prices, dates, download settings, and publication settings are not copied as full previous-track presets.

### Date picker

Release date fields use a reusable OpenTunes date picker rather than a visually inconsistent native browser calendar. The closed control shows a human-readable local date, a calendar icon, clear action, and visible focus state. The popover uses the dark application surface, brand-colored selected date, muted out-of-month days, and no white panel backgrounds.

The calendar supports:

- Previous and next month navigation.
- Keyboard arrow navigation through days.
- Enter or Space to select.
- Escape to close and return focus.
- A clear action for optional dates.
- A hidden or generated ISO `YYYY-MM-DD` form value for the backend.

Date construction and formatting must avoid UTC shifts of the selected calendar day.

### Switches

Checkbox-looking toggles become a reusable switch with dark inactive state, brand-colored active state, clear labels, visible keyboard focus, and `role="switch"` semantics. It must support Space/Enter operation and expose an unambiguous form value. Disabled and upload-in-progress states remain readable.

## Components and Boundaries

The current all-client page should be split so data access stays server-side:

- The upload page server component authenticates the creator, queries ownership-scoped suggestion values, and passes a serializable suggestion set into the studio.
- `UploadStudio` owns the Single/Album mode, shared form state, active-upload warning, and submission orchestration.
- `AudioDropzone` normalizes selected files and creates track-row state.
- `AlbumDetailsPanel` owns shared artwork and album-level values.
- `TrackUploadList` owns row ordering and delegates each row to `TrackUploadRow`.
- `TrackUploadRow` owns editable title, resolved metadata display, advanced overrides, status, error, and retry action.
- `SuggestionField` provides accessible recent-value suggestions without coupling fields to database access.
- `DatePicker` owns calendar state and emits an ISO date string.
- `SwitchField` owns accessible boolean interaction and form serialization.

Pure helpers handle filename parsing, metadata/default resolution, suggestion normalization, date-grid generation, row reordering, and upload-state transitions. These helpers form the first testable boundary and keep the visual components small.

## Server and Data Design

### Album creation

Album mode first sends the album metadata and shared cover to a creator-owned release endpoint. The endpoint:

1. Revalidates session role and request origin.
2. Validates release title, type, date, cover size, and cover MIME/content.
3. Stores the cover once.
4. Creates the `Release` with the returned cover URL.
5. Returns the release identifier and cover URL.

The release is created before audio uploads begin. If release creation fails, no audio upload starts. If every track later fails, the empty release remains visible and editable in Releases.

### Track uploads

Tracks upload sequentially through the existing `/api/tracks` validation and storage pipeline. Album requests add a release identifier, position, and stable client upload key. On the server, release ownership is checked independently of page authentication.

For each successful request, one database transaction creates or resolves:

- The `Track` with its resolved metadata and the shared release cover URL.
- The immutable original `AudioVersion`.
- The ordered `ReleaseTrack` membership.

The response returns the track identifier and membership position. Paths relevant to browsing, the creator dashboard, Releases, and the new release are revalidated.

### Idempotency

Each album and track row receives a stable client-generated creation key. The schema stores optional unique creation keys on `Release` and `Track`. Retrying with the same key and same owner returns the existing resource rather than creating a duplicate. A key owned by another creator is never disclosed and is rejected. The browser reuses the same key for retries during the current upload session.

Single-track uploads may use the same idempotency mechanism, while existing tracks remain valid because the new fields are optional.

### Cover lifecycle

The shared cover file is written once during release creation. Its URL is referenced by both the release and its album tracks. Track creation does not write duplicate cover files. Failure before release persistence deletes the newly written file. Deleting an individual album track must not delete shared artwork. Shared-cover deletion remains tied to explicit release-cover replacement or release deletion with a reference check.

## Upload State and Failure Handling

Each row moves through explicit states: `reading`, `ready`, `uploading`, `uploaded`, or `failed`. Album creation has its own `creating`, `created`, or `failed` state.

Uploads are sequential to keep progress predictable, reduce browser/server memory pressure, and make failure recovery clear. One row failure records its server message and continues with the next waiting row. The completion summary reports successful and failed counts. Failed rows expose Retry; uploaded rows cannot be accidentally resubmitted.

If a request response is interrupted after persistence, the stable creation key makes retry safe. Client-side validation catches obvious unsupported or oversized files early, while the server remains authoritative. A `beforeunload` warning is active only while release creation or a track request is in progress.

No successful track is rolled back because a different row fails.

## Visual System

The upload studio must reuse the established OpenTunes palette, radii, spacing, and focus treatment:

- Page background: existing `surface-900` and radial background treatment.
- Primary panels and popovers: `surface-800`, subtle glass, or equivalent dark translucent background.
- Nested and inactive surfaces: `surface-700` or restrained white opacity over the dark page.
- Borders: low-contrast white or brand opacity.
- Active controls and progress: brand rose gradient or solid brand color.
- Success and error states: restrained emerald and red treatments with text labels, not color alone.

No form control, suggestion menu, date popover, advanced panel, or upload row may render a default white background. Native select menus that cannot be styled consistently should be replaced with an app-styled accessible control or given an explicit supported dark scheme.

Motion is limited to disclosures, progress, drag affordances, and switch state. Reduced-motion preferences disable nonessential transitions.

## Accessibility

- Every icon-only action has an accessible name.
- Drop zones remain keyboard-operable file inputs.
- Drag reordering has keyboard move-up and move-down alternatives.
- Status changes use a polite live region; errors use an alert relationship to their row.
- Advanced disclosures communicate `aria-expanded` and their controlled region.
- Suggestion fields follow combobox/listbox keyboard behavior.
- Calendar dates, selected states, and month navigation are announced clearly.
- Switches expose checked, disabled, and focus state without relying on color.
- Contrast and focus outlines remain visible on all dark surfaces.

## Testing and Verification

Because the repository has no test script, implementation begins by adding a lightweight TypeScript-capable test runner and `npm test`. Tests are written before production behavior and observed failing for the intended reason.

Automated coverage includes:

- Filename parsing and metadata precedence.
- Shared defaults versus explicit per-track overrides.
- Case-insensitive suggestion normalization and recent-use ordering.
- Row reordering and position generation.
- Local-date parsing, formatting, month grids, and keyboard movement.
- Switch form serialization and accessible state.
- Album ownership checks and validation.
- Sequential upload state transitions with partial success.
- Retry idempotency for albums and tracks.
- Successful `Track`, `AudioVersion`, and ordered `ReleaseTrack` creation.
- Shared-cover reuse without duplicate file writes.

Verification ends with targeted tests, the complete `npm test` suite, scoped formatting/whitespace checks for changed feature files, and `npm run build`. Visual QA uses an available browser runtime; if none is attached, that limitation is reported explicitly.

## Acceptance Criteria

- A creator can switch between single-track and album creation on `/admin/upload`.
- Album mode accepts multiple files, one shared cover, editable titles, and drag or keyboard ordering.
- Album-level values act as defaults and each track can optionally override advanced fields.
- Previous artist, genre, tags, license, and project values appear as ownership-scoped suggestions.
- Successful tracks remain saved and attached when another track fails.
- Failed rows can be retried without duplicating persisted albums or tracks.
- The release and ordered tracks appear in the existing Releases surface.
- Calendar and toggle controls match the dark OpenTunes UI and are keyboard accessible.
- No upload-related panel or popup falls back to a white background.
- Automated tests pass and `npm run build` completes successfully.
