# Upload Studio and Album Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dark, accessible upload studio that supports single tracks, parallel album creation with shared artwork and partial success, prior-submission suggestions, complete presets, and configurable creator upload preferences.

**Architecture:** Keep authentication and creator-owned queries in server components/services while a focused `UploadStudio` client component owns file state and orchestration. Create the release first, then send bounded parallel requests through the existing track-upload endpoint; stable creation keys make retries idempotent and each successful request atomically creates the track, original audio version, and ordered release membership. Extract metadata, preset, date, reorder, and concurrency logic into small pure modules tested before the UI consumes them.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 5 with SQLite, NextAuth, Tailwind CSS, `music-metadata`, Vitest, Testing Library, and jsdom.

---

## File Structure

### New files

- `vitest.config.ts` — Vitest aliases, jsdom environment, and setup file.
- `src/test/setup.ts` — Testing Library matchers and cleanup.
- `src/lib/upload/types.ts` — serializable upload values, presets, suggestions, and row-state types.
- `src/lib/upload/metadata.ts` — filename parsing, metadata precedence, suggestions, and preset application.
- `src/lib/upload/metadata.test.ts` — upload-value unit tests.
- `src/lib/upload/scheduler.ts` — bounded worker pool and immutable row-order helpers.
- `src/lib/upload/scheduler.test.ts` — concurrency, ordering, partial-failure, and retry tests.
- `src/lib/upload/date.ts` — local-calendar parsing, formatting, grid generation, and keyboard movement.
- `src/lib/upload/date.test.ts` — date helper tests.
- `src/lib/upload/preferences.ts` — concurrency and preset input validation.
- `src/lib/upload/preferences.test.ts` — settings-validation tests.
- `src/lib/upload/data.ts` — server-only creator settings, suggestion, named-preset, and previous-track queries.
- `src/lib/upload/actions.ts` — creator-owned settings and preset server actions.
- `src/lib/releases/upload.ts` — validated, idempotent album creation and shared-cover storage.
- `src/lib/releases/upload.test.ts` — release input and ownership contract tests.
- `src/lib/http/origin.ts` — shared same-origin request check for upload routes.
- `src/app/api/releases/route.ts` — origin/auth checked release creation endpoint.
- `src/components/upload/DatePicker.tsx` — dark accessible date control.
- `src/components/upload/DatePicker.test.tsx` — calendar interaction tests.
- `src/components/upload/SwitchField.tsx` — dark accessible boolean control.
- `src/components/upload/SwitchField.test.tsx` — switch interaction and form-value tests.
- `src/components/upload/SuggestionField.tsx` — dark combobox/listbox for recent values.
- `src/components/upload/PresetPicker.tsx` — grouped named/previous-track preset picker with overwrite preview.
- `src/components/upload/AudioDropzone.tsx` — one-or-many audio input and drag target.
- `src/components/upload/AlbumDetailsPanel.tsx` — shared cover, release metadata, and album defaults.
- `src/components/upload/TrackUploadRow.tsx` — row rename, advanced overrides, progress, and retry.
- `src/components/upload/UploadStudio.tsx` — mode state and single/album submission orchestration.
- `src/components/upload/UploadStudio.test.tsx` — mode, file, ordering, and partial-result UI tests.
- `src/components/settings/UploadPreferencesForm.tsx` — concurrency preference and preset CRUD UI.
- `src/app/admin/settings/page.tsx` — creator settings server page.

### Modified files

- `package.json`, `package-lock.json` — `npm test` and test dependencies.
- `prisma/schema.prisma` — idempotency keys, concurrency preference, and `UploadPreset`.
- `src/app/admin/upload/page.tsx` — replace the monolithic client page with authenticated server data loading and `UploadStudio`.
- `src/app/admin/layout.tsx` — add Settings navigation.
- `src/app/api/tracks/route.ts` — accept idempotent album membership uploads and revalidate Releases.
- `src/lib/tracks/upload.ts` — resolve release ownership/shared cover and create membership transactionally.
- `src/app/globals.css` — upload drag, calendar, popover, switch, reduced-motion, and dark native control rules.

## Task 1: Test Harness and Upload Metadata Domain

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/lib/upload/types.ts`
- Create: `src/lib/upload/metadata.test.ts`
- Create: `src/lib/upload/metadata.ts`

- [ ] **Step 1: Install the test harness and add the test command**

Run:

```bash
npm install --save-dev vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

Add this script to `package.json`:

```json
"test": "vitest run"
```

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
  },
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
```

- [ ] **Step 2: Write failing metadata and preset tests**

Create `src/lib/upload/metadata.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  applyPreset,
  normalizeSuggestions,
  parseAudioFilename,
  previewPresetOverwrite,
  resolveTrackValues,
} from "./metadata";

describe("parseAudioFilename", () => {
  it("removes track numbers and splits artist from title", () => {
    expect(parseAudioFilename("02 - Nova Vale - Static_Bloom.wav")).toEqual({
      artist: "Nova Vale",
      title: "Static Bloom",
    });
  });
});

describe("resolveTrackValues", () => {
  it("uses explicit overrides before detected metadata and shared defaults", () => {
    expect(resolveTrackValues(
      { artist: "Shared", genre: "Electronic" },
      { artist: "Tagged", title: "Tagged title" },
      { title: "Renamed" }
    )).toMatchObject({ artist: "Tagged", genre: "Electronic", title: "Renamed" });
  });
});

describe("presets and suggestions", () => {
  it("copies defined preset values and previews overwritten fields", () => {
    const current = { title: "Current", genre: "Rock", allowDownload: false };
    const preset = { title: "Previous", genre: "Ambient", allowDownload: true };
    expect(previewPresetOverwrite(current, preset)).toEqual(["title", "genre", "allowDownload"]);
    expect(applyPreset(current, preset)).toEqual(preset);
  });

  it("deduplicates suggestions case-insensitively in recent-first order", () => {
    expect(normalizeSuggestions([" Ambient ", "ambient", "Rock", ""])).toEqual([
      "Ambient",
      "Rock",
    ]);
  });
});
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
npm test -- src/lib/upload/metadata.test.ts
```

Expected: FAIL because `./metadata` does not exist.

- [ ] **Step 4: Add the minimal serializable types and helper implementation**

Create `src/lib/upload/types.ts`:

```ts
export interface UploadValues {
  title: string;
  artist: string;
  genre: string;
  album: string;
  tags: string;
  license: string;
  description: string;
  price: string;
  releaseDate: string;
  allowDownload: boolean;
  published: boolean;
}

export type UploadValuePatch = Partial<UploadValues>;

export interface UploadPresetView extends UploadValuePatch {
  id: string;
  name: string;
  source: "saved" | "track";
}

export interface UploadSuggestions {
  artist: string[];
  genre: string[];
  tags: string[];
  license: string[];
  album: string[];
}

export interface UploadStudioData {
  concurrency: number;
  suggestions: UploadSuggestions;
  presets: UploadPresetView[];
}

export type UploadRowStatus = "reading" | "ready" | "uploading" | "uploaded" | "failed";

export interface UploadRow {
  clientId: string;
  creationKey: string;
  file: File;
  detected: UploadValuePatch;
  overrides: UploadValuePatch;
  status: UploadRowStatus;
  error: string | null;
  trackId: string | null;
}
```

Create `src/lib/upload/metadata.ts`:

```ts
import type { UploadValuePatch } from "./types";

export function parseAudioFilename(name: string) {
  const clean = name
    .replace(/\.[^.]+$/, "")
    .replace(/^\s*\d{1,3}\s*[-._]+\s*/, "")
    .replace(/_/g, " ")
    .trim();
  const parts = clean.split(/\s+-\s+/);
  return parts.length > 1
    ? { artist: parts[0], title: parts.slice(1).join(" - ") }
    : { artist: "", title: clean };
}

export function resolveTrackValues(
  shared: UploadValuePatch,
  detected: UploadValuePatch,
  overrides: UploadValuePatch
) {
  return { ...shared, ...detected, ...overrides };
}

export function applyPreset<T extends UploadValuePatch>(current: T, preset: UploadValuePatch): T {
  const defined = Object.fromEntries(
    Object.entries(preset).filter(([, value]) => value !== undefined)
  ) as UploadValuePatch;
  return { ...current, ...defined };
}

export function previewPresetOverwrite(current: UploadValuePatch, preset: UploadValuePatch) {
  return Object.keys(preset).filter((key) => {
    const field = key as keyof UploadValuePatch;
    const before = current[field];
    const after = preset[field];
    return before !== undefined && before !== "" && after !== undefined && before !== after;
  });
}

export function normalizeSuggestions(values: string[], limit = 8) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLocaleLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length === limit) break;
  }
  return result;
}
```

- [ ] **Step 5: Run the metadata tests and verify GREEN**

Run:

```bash
npm test -- src/lib/upload/metadata.test.ts
```

Expected: PASS with 4 tests.

- [ ] **Step 6: Commit the test harness and metadata domain**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts src/lib/upload/types.ts src/lib/upload/metadata.ts src/lib/upload/metadata.test.ts
git commit -m "Add upload studio test harness and metadata helpers"
```

## Task 2: Bounded Upload Scheduler and Ordering

**Files:**
- Create: `src/lib/upload/scheduler.test.ts`
- Create: `src/lib/upload/scheduler.ts`

- [ ] **Step 1: Write failing worker-pool and reorder tests**

Create `src/lib/upload/scheduler.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { moveItem, runBounded } from "./scheduler";

describe("runBounded", () => {
  it("never exceeds the requested concurrency and preserves result order", async () => {
    let active = 0;
    let maximum = 0;
    const result = await runBounded([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      active -= 1;
      return value * 10;
    });
    expect(maximum).toBe(2);
    expect(result).toEqual([
      { status: "fulfilled", value: 10 },
      { status: "fulfilled", value: 20 },
      { status: "fulfilled", value: 30 },
      { status: "fulfilled", value: 40 },
    ]);
  });

  it("captures one rejection without cancelling other items", async () => {
    const result = await runBounded([1, 2, 3], 3, async (value) => {
      if (value === 2) throw new Error("bad file");
      return value;
    });
    expect(result.map((entry) => entry.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
  });
});

it("moves a row without mutating the original order", () => {
  const source = ["a", "b", "c"];
  expect(moveItem(source, 2, 0)).toEqual(["c", "a", "b"]);
  expect(source).toEqual(["a", "b", "c"]);
});
```

- [ ] **Step 2: Run the scheduler test and verify RED**

Run:

```bash
npm test -- src/lib/upload/scheduler.test.ts
```

Expected: FAIL because `./scheduler` does not exist.

- [ ] **Step 3: Implement the bounded worker pool and immutable move helper**

Create `src/lib/upload/scheduler.ts`:

```ts
export async function runBounded<T, R>(
  items: readonly T[],
  requestedLimit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const limit = Math.max(1, Math.min(4, Math.floor(requestedLimit) || 1));
  const results = new Array<PromiseSettledResult<R>>(items.length);
  let cursor = 0;

  async function consume() {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { status: "fulfilled", value: await worker(items[index], index) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, consume));
  return results;
}

export function moveItem<T>(items: readonly T[], from: number, to: number) {
  if (from < 0 || from >= items.length || to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
```

- [ ] **Step 4: Run the scheduler tests and verify GREEN**

Run:

```bash
npm test -- src/lib/upload/scheduler.test.ts
```

Expected: PASS with 3 tests.

- [ ] **Step 5: Commit the scheduler**

```bash
git add src/lib/upload/scheduler.ts src/lib/upload/scheduler.test.ts
git commit -m "Add bounded album upload scheduler"
```

## Task 3: Local Date Domain and Accessible Dark Controls

**Files:**
- Create: `src/lib/upload/date.test.ts`
- Create: `src/lib/upload/date.ts`
- Create: `src/components/upload/DatePicker.test.tsx`
- Create: `src/components/upload/DatePicker.tsx`
- Create: `src/components/upload/SwitchField.test.tsx`
- Create: `src/components/upload/SwitchField.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Write failing local-date tests**

Create `src/lib/upload/date.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildMonthGrid, formatIsoDate, moveIsoDate } from "./date";

describe("local calendar helpers", () => {
  it("formats an ISO day without a UTC shift", () => {
    expect(formatIsoDate("2026-07-23", "en-GB")).toBe("23 July 2026");
  });

  it("builds a Monday-first six-week grid", () => {
    const grid = buildMonthGrid(2026, 6);
    expect(grid).toHaveLength(42);
    expect(grid[0].iso).toBe("2026-06-29");
  });

  it("moves by one week for ArrowDown", () => {
    expect(moveIsoDate("2026-07-23", "ArrowDown")).toBe("2026-07-30");
  });
});
```

- [ ] **Step 2: Run date tests and verify RED**

Run `npm test -- src/lib/upload/date.test.ts`.

Expected: FAIL because `./date` does not exist.

- [ ] **Step 3: Implement local date parsing, formatting, grids, and movement**

Create `src/lib/upload/date.ts` with these exported contracts and local constructors:

```ts
function localDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function isoFromDate(date: Date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

export function formatIsoDate(iso: string, locale?: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(localDate(iso));
}

export function buildMonthGrid(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1, 12);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthIndex, 1 - mondayOffset, 12);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return { iso: isoFromDate(date), inMonth: date.getMonth() === monthIndex };
  });
}

export function moveIsoDate(iso: string, key: string) {
  const deltas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
  const date = localDate(iso);
  date.setDate(date.getDate() + (deltas[key] ?? 0));
  return isoFromDate(date);
}
```

- [ ] **Step 4: Verify date helpers pass**

Run `npm test -- src/lib/upload/date.test.ts`.

Expected: PASS with 3 tests.

- [ ] **Step 5: Write failing component interaction tests**

Create focused tests that render the controls inside a `<form>`:

```tsx
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { DatePicker } from "./DatePicker";
import { SwitchField } from "./SwitchField";

it("selects and clears a date with a serialized ISO value", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<DatePicker name="releaseDate" value="2026-07-23" onChange={onChange} />);
  expect(screen.getByDisplayValue("2026-07-23")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /clear date/i }));
  expect(onChange).toHaveBeenCalledWith("");
});

it("toggles with an accessible switch and hidden form value", async () => {
  const user = userEvent.setup();
  function Harness() {
    const [checked, setChecked] = useState(false);
    return <SwitchField name="allowDownload" label="Allow downloads" checked={checked} onChange={setChecked} />;
  }
  render(<Harness />);
  const control = screen.getByRole("switch", { name: "Allow downloads" });
  await user.click(control);
  expect(control).toHaveAttribute("aria-checked", "true");
  expect(screen.getByDisplayValue("on")).toBeInTheDocument();
});
```

- [ ] **Step 6: Run component tests and verify RED**

Run:

```bash
npm test -- src/components/upload/DatePicker.test.tsx src/components/upload/SwitchField.test.tsx
```

Expected: FAIL because both controls are missing.

- [ ] **Step 7: Implement the controls with dark surfaces and ARIA behavior**

`DatePicker.tsx` must render a `type="hidden"` ISO input, a labeled trigger, a dark `role="dialog"` popover, month navigation, a 42-cell grid from `buildMonthGrid`, arrow-key movement, selection, Escape close, and focus restoration. `SwitchField.tsx` must keep internal checked state synchronized with its prop and render:

```tsx
<>
  <input type="hidden" name={name} value={checked ? "on" : "off"} />
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={checked ? "bg-brand-600" : "bg-surface-700"}
  >
    <span className={checked ? "translate-x-5 bg-white" : "translate-x-0 bg-zinc-400"} />
  </button>
</>
```

Add only upload-specific dark surface, focus-visible, popover shadow, `color-scheme: dark`, and reduced-motion rules to `src/app/globals.css`; do not alter the carousel rules.

- [ ] **Step 8: Run control tests and commit**

Run:

```bash
npm test -- src/lib/upload/date.test.ts src/components/upload/DatePicker.test.tsx src/components/upload/SwitchField.test.tsx
```

Expected: PASS.

```bash
git add src/lib/upload/date.ts src/lib/upload/date.test.ts src/components/upload/DatePicker.tsx src/components/upload/DatePicker.test.tsx src/components/upload/SwitchField.tsx src/components/upload/SwitchField.test.tsx src/app/globals.css
git commit -m "Add dark accessible upload controls"
```

## Task 4: Prisma Upload Preferences, Presets, and Idempotency

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/upload/preferences.test.ts`
- Create: `src/lib/upload/preferences.ts`

- [ ] **Step 1: Write failing preference-validation tests**

Create `src/lib/upload/preferences.test.ts`:

```ts
import { expect, it } from "vitest";
import { normalizePresetName, parseUploadConcurrency } from "./preferences";

it("accepts only concurrency values from one through four", () => {
  expect(parseUploadConcurrency("1")).toBe(1);
  expect(parseUploadConcurrency("4")).toBe(4);
  expect(() => parseUploadConcurrency("5")).toThrow("between 1 and 4");
});

it("normalizes preset names for per-user uniqueness", () => {
  expect(normalizePresetName("  Late Night  ")).toEqual({
    name: "Late Night",
    normalizedName: "late night",
  });
});
```

- [ ] **Step 2: Verify RED**

Run `npm test -- src/lib/upload/preferences.test.ts`.

Expected: FAIL because `./preferences` does not exist.

- [ ] **Step 3: Implement validation helpers**

Create `src/lib/upload/preferences.ts`:

```ts
export function parseUploadConcurrency(value: FormDataEntryValue | number) {
  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new Error("Upload concurrency must be between 1 and 4.");
  }
  return concurrency;
}

export function normalizePresetName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) throw new Error("Preset name must be 1 to 80 characters.");
  return { name, normalizedName: name.toLocaleLowerCase() };
}
```

- [ ] **Step 4: Verify GREEN**

Run `npm test -- src/lib/upload/preferences.test.ts`.

Expected: PASS with 2 tests.

- [ ] **Step 5: Extend the Prisma schema**

Add to `User`:

```prisma
uploadConcurrency Int            @default(2)
uploadPresets     UploadPreset[]
```

Add to `Track` and `Release` respectively:

```prisma
creationKey String? @unique
```

Add the model:

```prisma
model UploadPreset {
  id             String   @id @default(cuid())
  name           String
  normalizedName String
  title          String?
  artist         String?
  genre          String?
  project        String?
  tags           String?
  license        String?
  description    String?
  price          Float?
  releaseDate    DateTime?
  allowDownload  Boolean?
  published      Boolean?
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([userId, normalizedName])
  @@index([userId])
}
```

- [ ] **Step 6: Push and inspect the schema**

Run:

```bash
npm run db:push
npx prisma validate
npx prisma generate
```

Expected: schema valid, SQLite synchronized, Prisma Client generated.

- [ ] **Step 7: Commit schema and preference helpers**

```bash
git add prisma/schema.prisma src/lib/upload/preferences.ts src/lib/upload/preferences.test.ts
git commit -m "Add upload preferences presets and idempotency schema"
```

Do not add generated files under `node_modules/.prisma` even when they appear in `git status`.

## Task 5: Creator-Owned Preset Data, Actions, and Settings UI

**Files:**
- Create: `src/lib/upload/data.ts`
- Create: `src/lib/upload/actions.ts`
- Create: `src/components/settings/UploadPreferencesForm.tsx`
- Create: `src/app/admin/settings/page.tsx`
- Modify: `src/app/admin/layout.tsx`
- Test: `src/lib/upload/preferences.test.ts`

- [ ] **Step 1: Extend the failing preference test with form parsing**

Add to `src/lib/upload/preferences.test.ts`:

```ts
import { presetPatchFromFormData } from "./preferences";

it("keeps omitted preset values undefined and parses supplied booleans", () => {
  const data = new FormData();
  data.set("artist", "Nova Vale");
  data.set("allowDownload", "on");
  expect(presetPatchFromFormData(data)).toEqual({
    artist: "Nova Vale",
    allowDownload: true,
  });
});
```

- [ ] **Step 2: Verify RED**

Run `npm test -- src/lib/upload/preferences.test.ts`.

Expected: FAIL because `presetPatchFromFormData` is missing.

- [ ] **Step 3: Implement exact optional-field parsing**

Add `presetPatchFromFormData` to `preferences.ts`. Iterate the string fields `title`, `artist`, `genre`, `project`, `tags`, `license`, `description`, `releaseDate`, and `price`; include a field only when `formData.has(name)`, trim its value, validate price as non-negative, and parse `allowDownload`/`published` only when those keys are present. Return an `UploadValuePatch` using `album` as the client name for Prisma's `project` field.

Core serialization:

```ts
const result: UploadValuePatch = {};
for (const field of ["title", "artist", "genre", "album", "tags", "license", "description", "releaseDate"] as const) {
  if (formData.has(field)) result[field] = String(formData.get(field) ?? "").trim();
}
if (formData.has("price")) {
  const raw = String(formData.get("price") ?? "").trim();
  if (raw && (!Number.isFinite(Number(raw)) || Number(raw) < 0)) throw new Error("Price must be non-negative.");
  result.price = raw;
}
if (formData.has("allowDownload")) result.allowDownload = formData.get("allowDownload") === "on";
if (formData.has("published")) result.published = formData.get("published") === "on";
return result;
```

- [ ] **Step 4: Verify GREEN**

Run `npm test -- src/lib/upload/preferences.test.ts`.

Expected: PASS with 3 tests.

- [ ] **Step 5: Add the server-only data boundary**

In `src/lib/upload/data.ts`, use `getServerSession(authOptions)` and Prisma to implement the `UploadStudioData` contract from `src/lib/upload/types.ts`:

```ts
export async function getUploadStudioData(): Promise<UploadStudioData>;
export async function getUploadSettingsData(): Promise<{
  concurrency: number;
  presets: UploadPresetView[];
}>;
```

Both functions must redirect listeners to `/library`, redirect anonymous users to `/admin/login`, resolve a persisted `User`, and query only that user's tracks and presets. Map prior tracks to `source: "track"` without `audioUrl`, `coverUrl`, counters, creator IDs, or relationships. Feed recent-first field arrays through `normalizeSuggestions`.

- [ ] **Step 6: Add creator-owned server actions**

Create `src/lib/upload/actions.ts` with `"use server"` and these exports:

```ts
export async function updateUploadConcurrency(value: number): Promise<{ concurrency: number }>;
export async function createUploadPreset(formData: FormData): Promise<{ presetId: string }>;
export async function updateUploadPreset(presetId: string, formData: FormData): Promise<{ presetId: string }>;
export async function deleteUploadPreset(presetId: string): Promise<{ presetId: string }>;
```

Each action re-resolves the persisted creator, validates with `parseUploadConcurrency`, `normalizePresetName`, and `presetPatchFromFormData`, and includes `userId` in every update/delete lookup. Map `album` to `project`, ISO date strings to local-noon `Date`, and empty optional strings to `null`. Catch Prisma `P2002` and return the user-facing error `A preset with this name already exists.` Revalidate `/admin/settings` and `/admin/upload`.

- [ ] **Step 7: Build Settings with dark controls**

Create `src/app/admin/settings/page.tsx` as a server component that calls `getUploadSettingsData()` and renders `UploadPreferencesForm`. The client form must:

- Offer concurrency buttons 1, 2, 3, and 4 with the active value in brand rose.
- Save the preference through `updateUploadConcurrency`.
- List named presets with Edit and Delete actions.
- Open a dark preset editor using `SuggestionField`, `DatePicker`, and `SwitchField`.
- Submit only fields the creator enabled for that preset, preserving optional semantics.
- Display action errors inline with `role="alert"`.

Add a Settings entry to both desktop and mobile navigation in `src/app/admin/layout.tsx`:

```ts
{ href: "/admin/settings", label: "Settings", icon: Settings2 },
```

- [ ] **Step 8: Run tests, build-check the route, and commit**

Run:

```bash
npm test -- src/lib/upload/preferences.test.ts
npx tsc --noEmit
```

Expected: tests pass and TypeScript reports no errors.

```bash
git add src/lib/upload/data.ts src/lib/upload/actions.ts src/lib/upload/preferences.ts src/lib/upload/preferences.test.ts src/components/settings/UploadPreferencesForm.tsx src/app/admin/settings/page.tsx src/app/admin/layout.tsx
git commit -m "Add creator upload preferences and presets"
```

## Task 6: Idempotent Release Creation with One Shared Cover

**Files:**
- Create: `src/lib/releases/upload.test.ts`
- Create: `src/lib/releases/upload.ts`
- Create: `src/lib/http/origin.ts`
- Create: `src/app/api/releases/route.ts`
- Modify: `src/app/api/tracks/route.ts`
- Modify: `src/lib/actions.ts`

- [ ] **Step 1: Write failing release-input tests**

Create `src/lib/releases/upload.test.ts`:

```ts
import { expect, it } from "vitest";
import { canManageRelease, parseReleaseUpload } from "./upload";

it("parses a valid album request with stable creation key", () => {
  const data = new FormData();
  data.set("title", "Afterglow Archive");
  data.set("type", "album");
  data.set("releaseDate", "2026-07-23");
  data.set("creationKey", "album-123");
  expect(parseReleaseUpload(data)).toMatchObject({
    title: "Afterglow Archive",
    type: "album",
    creationKey: "album-123",
  });
});

it("rejects missing creation keys and invalid release types", () => {
  expect(() => parseReleaseUpload(new FormData())).toThrow("creation key");
  const data = new FormData();
  data.set("title", "Album");
  data.set("type", "mixtape");
  data.set("creationKey", "album-123");
  expect(() => parseReleaseUpload(data)).toThrow("release type");
});

it("permits only the owning creator or an admin", () => {
  expect(canManageRelease({ userId: "creator-a", role: "CREATOR" }, "creator-b")).toBe(false);
  expect(canManageRelease({ userId: "admin", role: "ADMIN" }, "creator-b")).toBe(true);
});
```

- [ ] **Step 2: Run and verify RED**

Run `npm test -- src/lib/releases/upload.test.ts`.

Expected: FAIL because `src/lib/releases/upload.ts` does not exist.

- [ ] **Step 3: Implement release parsing and creation service**

Create `src/lib/releases/upload.ts` with:

```ts
export class ReleaseUploadError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "ReleaseUploadError";
  }
}

export function canManageRelease(
  actor: { userId: string; role: string },
  creatorId: string
) {
  return actor.role === "ADMIN" || actor.userId === creatorId;
}

export function parseReleaseUpload(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const creationKey = String(formData.get("creationKey") ?? "").trim();
  if (!creationKey) throw new ReleaseUploadError("An album creation key is required.");
  if (!title || title.length > 200) throw new ReleaseUploadError("Release title is required and must be 200 characters or fewer.");
  if (!new Set(["single", "ep", "album"]).has(type)) throw new ReleaseUploadError("Choose a valid release type.");
  return {
    title,
    type,
    creationKey,
    description: String(formData.get("description") ?? "").trim(),
    releaseDate: String(formData.get("releaseDate") ?? "").trim(),
    published: formData.get("published") !== "draft",
    cover: formData.get("cover") instanceof File ? formData.get("cover") as File : null,
  };
}
```

Add `createReleaseFromUpload(formData, session)` that resolves the creator as `createTrackFromUpload` does, returns an existing same-owner release for `creationKey`, validates the cover with `validateImageFile`, writes it once through `ensureUploadDir("covers")`, creates the release, unlinks the new file if Prisma fails, and returns `{ releaseId, coverUrl }`. If the creation key belongs to another creator, return a generic 409 without disclosing the existing release.

Update `deleteRelease` in `src/lib/actions.ts` so deleting a release never deletes its tracks, then remove its cover file only when no remaining release or track references the same URL. Resolve the public cover path through the existing storage helper and ignore `ENOENT`; do not delete shared artwork from individual track deletion.

- [ ] **Step 4: Verify parser tests pass**

Run `npm test -- src/lib/releases/upload.test.ts`.

Expected: PASS with 3 tests.

- [ ] **Step 5: Add the authenticated release route**

Create `src/app/api/releases/route.ts` mirroring `/api/tracks` origin and role checks. Parse multipart form data, call `createReleaseFromUpload`, translate `ReleaseUploadError.status`, and revalidate `/admin`, `/admin/releases`, and `/browse` before returning status 201.

Extract the existing origin comparison into an exported `src/lib/http/origin.ts` helper so both routes call the same code:

```ts
export function requestHasValidOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim()
    || request.headers.get("host");
  if (!host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
```

- [ ] **Step 6: Run tests/typecheck and commit**

Run:

```bash
npm test -- src/lib/releases/upload.test.ts
npx tsc --noEmit
```

Expected: PASS and no TypeScript errors.

```bash
git add src/lib/releases/upload.ts src/lib/releases/upload.test.ts src/lib/http/origin.ts src/app/api/releases/route.ts src/app/api/tracks/route.ts src/lib/actions.ts
git commit -m "Add idempotent album release creation"
```

## Task 7: Transactional Album Track Membership and Retry Safety

**Files:**
- Modify: `src/lib/tracks/upload.ts`
- Modify: `src/app/api/tracks/route.ts`
- Create: `src/lib/tracks/upload-membership.test.ts`
- Create: `src/lib/tracks/upload-membership.ts`

- [ ] **Step 1: Write failing album-membership input tests**

Create `src/lib/tracks/upload-membership.test.ts`:

```ts
import { expect, it } from "vitest";
import { parseAlbumMembership } from "./upload-membership";

it("parses release membership with a zero-based position", () => {
  const data = new FormData();
  data.set("releaseId", "release-1");
  data.set("position", "0");
  data.set("creationKey", "track-1");
  expect(parseAlbumMembership(data)).toEqual({
    releaseId: "release-1",
    position: 0,
    creationKey: "track-1",
  });
});

it("rejects album membership without an idempotency key", () => {
  const data = new FormData();
  data.set("releaseId", "release-1");
  expect(() => parseAlbumMembership(data)).toThrow("creation key");
});
```

- [ ] **Step 2: Run and verify RED**

Run `npm test -- src/lib/tracks/upload-membership.test.ts`.

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement membership parsing**

Create `src/lib/tracks/upload-membership.ts`:

```ts
export function parseAlbumMembership(formData: FormData) {
  const releaseId = String(formData.get("releaseId") ?? "").trim();
  if (!releaseId) return null;
  const creationKey = String(formData.get("creationKey") ?? "").trim();
  if (!creationKey) throw new Error("An album track creation key is required.");
  const position = Number(formData.get("position"));
  if (!Number.isInteger(position) || position < 0) throw new Error("Track position must be a non-negative integer.");
  return { releaseId, position, creationKey };
}
```

- [ ] **Step 4: Run and verify GREEN**

Run `npm test -- src/lib/tracks/upload-membership.test.ts`.

Expected: PASS with 2 tests.

- [ ] **Step 5: Extend `createTrackFromUpload` before changing the UI**

At the start of `createTrackFromUpload`, parse membership and an optional single-track creation key. Before writing files:

1. Query `Track.creationKey`; if it belongs to the resolved creator, return its ID and existing membership position.
2. If membership exists, query `Release` and require the same creator unless the session is ADMIN.
3. Use the release's `coverUrl` when the request does not contain its own cover.

Inside the existing Prisma transaction, add `creationKey` to `Track.create`, then create membership after `AudioVersion`:

```ts
if (membership) {
  await tx.releaseTrack.create({
    data: {
      releaseId: membership.releaseId,
      trackId: createdTrack.id,
      position: membership.position,
    },
  });
}
```

Return:

```ts
return { trackId: track.id, position: membership?.position ?? null };
```

Map parser errors to `TrackUploadError`, preserve written-file cleanup, and rely on the unique creation key plus transaction rollback for concurrent duplicate requests.

- [ ] **Step 6: Revalidate release surfaces and verify**

In the track route, add `revalidatePath("/admin/releases")` after successful creation.

Run:

```bash
npm test -- src/lib/tracks/upload-membership.test.ts src/lib/releases/upload.test.ts
npx tsc --noEmit
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 7: Commit membership support**

```bash
git add src/lib/tracks/upload.ts src/lib/tracks/upload-membership.ts src/lib/tracks/upload-membership.test.ts src/app/api/tracks/route.ts
git commit -m "Attach idempotent uploads to album releases"
```

## Task 8: Suggestion and Preset Components

**Files:**
- Create: `src/components/upload/SuggestionField.tsx`
- Create: `src/components/upload/PresetPicker.tsx`
- Create: `src/components/upload/SuggestionField.test.tsx`
- Create: `src/components/upload/PresetPicker.test.tsx`

- [ ] **Step 1: Write failing accessible-picker tests**

Create tests that prove keyboard selection and overwrite confirmation:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { SuggestionField } from "./SuggestionField";
import { PresetPicker } from "./PresetPicker";

it("filters and selects a recent suggestion", async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<SuggestionField label="Genre" value="" suggestions={["Ambient", "Rock"]} onChange={onChange} />);
  await user.type(screen.getByRole("combobox", { name: "Genre" }), "amb");
  await user.keyboard("{ArrowDown}{Enter}");
  expect(onChange).toHaveBeenCalledWith("Ambient");
});

it("names overwritten fields before applying a full preset", async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(<PresetPicker current={{ title: "Current" }} presets={[{ id: "p1", name: "Prior", source: "track", title: "Old" }]} onApply={onApply} />);
  await user.click(screen.getByRole("button", { name: /prior/i }));
  expect(screen.getByText(/title/i)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /apply preset/i }));
  expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ title: "Old" }));
});
```

- [ ] **Step 2: Run and verify RED**

Run:

```bash
npm test -- src/components/upload/SuggestionField.test.tsx src/components/upload/PresetPicker.test.tsx
```

Expected: FAIL because both components are missing.

- [ ] **Step 3: Implement `SuggestionField`**

Use a controlled input with `role="combobox"`, `aria-expanded`, `aria-controls`, active-descendant tracking, and a dark absolute `role="listbox"`. Filter case-insensitively, support ArrowUp/ArrowDown/Enter/Escape, close on blur after pointer selection, and never force a suggested value.

- [ ] **Step 4: Implement `PresetPicker`**

Group `source: "saved"` and `source: "track"` under labeled dark sections. When chosen, call `previewPresetOverwrite(current, preset)`. Apply immediately if the list is empty; otherwise show a dark confirmation panel listing exact field labels and buttons **Cancel** and **Apply preset**. Never include non-upload properties in the component's preset type.

- [ ] **Step 5: Verify and commit**

Run:

```bash
npm test -- src/components/upload/SuggestionField.test.tsx src/components/upload/PresetPicker.test.tsx
```

Expected: PASS.

```bash
git add src/components/upload/SuggestionField.tsx src/components/upload/SuggestionField.test.tsx src/components/upload/PresetPicker.tsx src/components/upload/PresetPicker.test.tsx
git commit -m "Add upload suggestions and full preset picker"
```

## Task 9: Unified Single and Album Upload Studio

**Files:**
- Create: `src/components/upload/AudioDropzone.tsx`
- Create: `src/components/upload/AlbumDetailsPanel.tsx`
- Create: `src/components/upload/TrackUploadRow.tsx`
- Create: `src/components/upload/UploadStudio.test.tsx`
- Create: `src/components/upload/UploadStudio.tsx`
- Modify: `src/app/admin/upload/page.tsx`

- [ ] **Step 1: Write failing mode, ordering, and partial-result UI tests**

Create `src/components/upload/UploadStudio.test.tsx`. Stub `URL.createObjectURL` and mock only the network boundary with `vi.stubGlobal("fetch", vi.fn())`. Define the serializable fixture at module scope:

```ts
const fixtureData: UploadStudioData = {
  concurrency: 2,
  suggestions: { artist: [], genre: [], tags: [], license: [], album: [] },
  presets: [],
};
```

Cover these observable behaviors:

```tsx
it("switches to album mode and accepts multiple audio files", async () => {
  const user = userEvent.setup();
  render(<UploadStudio initialData={fixtureData} />);
  await user.click(screen.getByRole("button", { name: "Create album" }));
  const input = screen.getByLabelText(/add audio files/i);
  await user.upload(input, [
    new File(["a"], "01 - First.mp3", { type: "audio/mpeg" }),
    new File(["b"], "02 - Second.mp3", { type: "audio/mpeg" }),
  ]);
  expect(screen.getByDisplayValue("First")).toBeInTheDocument();
  expect(screen.getByDisplayValue("Second")).toBeInTheDocument();
});

it("keeps a successful row and offers retry for a failed row", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.mocked(fetch);
  fetchMock
    .mockResolvedValueOnce(new Response(JSON.stringify({ releaseId: "r1", coverUrl: "/cover.jpg" }), { status: 201 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ trackId: "t1" }), { status: 201 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Bad audio" }), { status: 400 }));
  render(<UploadStudio initialData={fixtureData} />);
  await user.click(screen.getByRole("button", { name: "Create album" }));
  await user.type(screen.getByRole("textbox", { name: /album title/i }), "Afterglow Archive");
  await user.upload(screen.getByLabelText(/add audio files/i), [
    new File(["a"], "01 - First.mp3", { type: "audio/mpeg" }),
    new File(["b"], "02 - Second.mp3", { type: "audio/mpeg" }),
  ]);
  await screen.findByDisplayValue("First");
  await user.click(screen.getByRole("button", { name: /create album & upload/i }));
  expect(await screen.findByText("Uploaded")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
});
```

Import `UploadStudioData` from `src/lib/upload/types.ts`, and keep all user interactions inside each test so tests do not share mutable upload state.

- [ ] **Step 2: Run and verify RED**

Run `npm test -- src/components/upload/UploadStudio.test.tsx`.

Expected: FAIL because `UploadStudio` does not exist.

- [ ] **Step 3: Build focused visual components**

`AudioDropzone` accepts `multiple`, filters `audio/*`, keeps its real file input keyboard reachable, and reports rejected items. `AlbumDetailsPanel` renders the shared cover, album title/type/date, shared defaults, PresetPicker, concurrency 1–4, and Advanced settings. `TrackUploadRow` renders filename/size/status, title input, keyboard move up/down, drag handle, Customize disclosure, resolved inherited values, error alert, and Retry.

The advanced album panel also exposes **Save current values as preset**. It collects the currently enabled shared fields, asks for a unique preset name, calls `createUploadPreset`, and inserts the returned preset into the local Saved presets group without starting an upload.

All containers use `bg-surface-800`, `bg-surface-700`, or existing glass utilities. Add `style={{ colorScheme: "dark" }}` only to native controls that remain; no component may use a default white menu or panel.

- [ ] **Step 4: Implement `UploadStudio` state and metadata parsing**

The component receives `initialData: UploadStudioData`, stores `mode`, `shared`, `rows`, `coverFile`, `release`, `concurrency`, and `busy`, and creates stable keys with `crypto.randomUUID()`. When files are selected:

1. Add rows in `reading` state in picker order.
2. Seed title/artist through `parseAudioFilename`.
3. Dynamically import `music-metadata` and merge embedded title, artist, genre, album, year, and artwork.
4. Mark each row `ready` even when tag parsing fails, preserving filename fallback.

Use `moveItem` before uploading and disable reorder controls once `busy` is true.

- [ ] **Step 5: Implement single-track submission without regression**

Single mode builds one `FormData` with resolved values, audio, optional cover, and creation key, POSTs `/api/tracks`, displays returned JSON errors inline, and routes to `/admin` only on success. Preserve existing role behavior, smart metadata messaging, max-size copy, license, price, tags, description, featured, download, and draft fields.

- [ ] **Step 6: Implement album creation and bounded parallel track submission**

Album submission must:

```ts
async function readJson(response: Response) {
  return await response.json().catch(() => ({})) as Record<string, unknown>;
}

const releaseResponse = await fetch("/api/releases", { method: "POST", body: releaseFormData });
const release = await readJson(releaseResponse);
if (!releaseResponse.ok || typeof release.releaseId !== "string") {
  throw new Error(typeof release.error === "string" ? release.error : "Could not create album.");
}
setRelease(release);

await runBounded(uploadableRows, concurrency, async (row) => {
  markRow(row.clientId, { status: "uploading", error: null });
  const response = await fetch("/api/tracks", {
    method: "POST",
    body: trackFormData(row, release.releaseId, currentPosition(row)),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload.error ?? "Upload failed.");
  markRow(row.clientId, { status: "uploaded", trackId: payload.trackId });
  return payload;
});
```

After settled results, mark rejected rows failed with their individual messages, retain uploaded rows, show counts, and provide Retry failed. Retry reuses the release ID and each row's creation key. Install `beforeunload` only while a release or track request is active and remove it on completion/unmount.

- [ ] **Step 7: Convert the route page to a server boundary**

Replace `src/app/admin/upload/page.tsx` with a server component:

```tsx
import { UploadStudio } from "@/components/upload/UploadStudio";
import { getUploadStudioData } from "@/lib/upload/data";

export default async function AdminUploadPage() {
  const initialData = await getUploadStudioData();
  return <UploadStudio initialData={initialData} />;
}
```

- [ ] **Step 8: Verify tests and typecheck**

Run:

```bash
npm test -- src/components/upload/UploadStudio.test.tsx src/lib/upload/metadata.test.ts src/lib/upload/scheduler.test.ts
npx tsc --noEmit
```

Expected: PASS and no TypeScript errors.

- [ ] **Step 9: Commit the unified studio**

```bash
git add src/app/admin/upload/page.tsx src/components/upload/AudioDropzone.tsx src/components/upload/AlbumDetailsPanel.tsx src/components/upload/TrackUploadRow.tsx src/components/upload/UploadStudio.tsx src/components/upload/UploadStudio.test.tsx
git commit -m "Build unified track and album upload studio"
```

## Task 10: Full Verification, Visual QA, and Documentation Check

**Files:**
- Modify only files required by failures found in this task.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
npm test
```

Expected: every metadata, scheduler, date, preference, release, membership, picker, control, and studio test passes with no warnings.

- [ ] **Step 2: Validate Prisma and production compilation**

Run:

```bash
npx prisma validate
npx prisma generate
npm run build
```

Expected: valid schema, generated client, successful Next.js production build, and routes including `/admin/upload`, `/admin/settings`, `/api/releases`, and `/api/tracks`.

- [ ] **Step 3: Check only feature-file whitespace**

Run:

```bash
git diff --check -- package.json package-lock.json prisma/schema.prisma vitest.config.ts src/test src/lib/upload src/lib/releases src/lib/http src/lib/tracks/upload.ts src/lib/tracks/upload-membership.ts src/app/api/releases src/app/api/tracks src/app/admin/upload src/app/admin/settings src/app/admin/layout.tsx src/components/upload src/components/settings src/app/globals.css
```

Expected: no output. Do not treat existing generated `.next` or `node_modules/.prisma` changes as feature whitespace failures.

- [ ] **Step 4: Run browser visual and interaction QA**

Start `npm run dev`, then use the available Orca embedded browser or in-app browser to verify:

1. Single mode selects a file, fills metadata, applies suggestions/presets, and uploads.
2. Album mode selects at least three files, shares one cover, renames and reorders rows, and exposes per-track Customize controls.
3. Concurrency 1 and 4 produce the correct number of simultaneous `uploading` rows.
4. A forced invalid audio row fails while valid rows remain Uploaded and Retry is present.
5. Settings saves concurrency and creates/edits/deletes a named preset.
6. Previous tracks appear under their own preset group without files or counters.
7. Calendar supports mouse and keyboard navigation and never opens a white popover.
8. Switches support keyboard operation, visible focus, and dark inactive styling.
9. Desktop and narrow mobile layouts have no overflow or unreachable controls.
10. Reduced-motion mode removes nonessential transitions.

Capture screenshots of album mode, expanded track customization, the calendar, and Settings for handoff. If no browser runtime is available, report that limitation and do not claim visual QA passed.

- [ ] **Step 5: Inspect repository state and commit only verification fixes**

Run:

```bash
git status --short
git diff --stat
```

If verification required code changes, rerun the specific failing test first, then `npm test` and `npm run build`. Inspect every changed feature diff and stage the complete upload-studio file set explicitly; unchanged paths are harmless:

```bash
git add package.json package-lock.json prisma/schema.prisma vitest.config.ts src/test src/lib/upload src/lib/releases src/lib/http src/lib/tracks/upload.ts src/lib/tracks/upload-membership.ts src/app/api/releases src/app/api/tracks src/app/admin/upload src/app/admin/settings src/app/admin/layout.tsx src/components/upload src/components/settings src/app/globals.css src/lib/actions.ts
git commit -m "Fix upload studio verification issues"
```

If no fixes were required, do not create an empty commit.

- [ ] **Step 6: Update the Orca checkpoint**

Run:

```bash
orca worktree set --worktree active --comment "upload studio implemented; tests and build verified" --workspace-status in-review --json
```

Expected: Orca reports `ok: true` and the worktree moves to in-review.

## Spec Coverage Check

- Unified Single/Album page, smart metadata, shared defaults, per-track overrides, dark surfaces, and responsive layout: Tasks 3, 8, and 9.
- Shared cover, real `Release`/`ReleaseTrack` ordering, ownership checks, and idempotent partial retries: Tasks 4, 6, and 7.
- Prior-field suggestions, previous-track full presets, named preset CRUD, and save-current-as-preset: Tasks 1, 5, 8, and 9.
- Configurable parallel uploads, stable positions, partial success, and retry without cancellation: Tasks 2, 7, and 9.
- Custom calendar, switches, keyboard alternatives, focus, live status, reduced motion, and no white popovers: Tasks 3, 8, 9, and 10.
- Test-first implementation, schema validation, production build, scoped whitespace checks, and visual QA: every implementation task plus Task 10.

No approved specification requirement is deferred to a later project.
