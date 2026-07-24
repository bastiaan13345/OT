# Infini Light Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current OpenTunes wordmark/icon with the provided Infini SVG and convert every app surface to the approved light editorial monochrome design.

**Architecture:** Introduce semantic monochrome Tailwind tokens, update the root shell and shared UI first, then migrate public and creator routes in bounded groups. A dependency-free Node audit provides repeatable checks for forbidden dark/rose/violet tokens and required logo integration without introducing a test framework.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 3, Node.js, Next Image

---

## File Map

**Create**

- `public/Infini.svg` — stable, publicly served copy of the supplied brand asset.
- `scripts/check-light-theme.mjs` — static theme regression audit grouped by implementation stage.

**Modify: theme foundation and shared shell**

- `package.json` — add the `theme:check` verification command.
- `tailwind.config.ts` — add semantic canvas, panel, soft, line, ink, muted, and faint colors; make the existing brand scale monochrome for compatibility.
- `src/app/globals.css` — white canvas, black selection, light glass styling, and light carousel focus border.
- `src/app/layout.tsx` — remove the forced dark class and dark body utilities.
- `src/components/Navbar.tsx` — use only `/Infini.svg` for desktop and mobile branding and migrate navigation states.

**Modify: shared UI and playback**

- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/TrackCard.tsx`
- `src/components/TrackDetailPage.tsx`
- `src/components/home/AlbumCarousel.tsx`
- `src/components/player/AudioPlayer.tsx`
- `src/components/profile/ProfileAvatarField.tsx`
- `src/components/DeleteTrackButton.tsx`
- `src/components/social/AddToPlaylistForm.tsx`
- `src/components/social/CommentForm.tsx`
- `src/components/social/FollowButton.tsx`
- `src/components/social/LikeButton.tsx`

**Modify: public product surfaces**

- `src/components/HomePage.tsx`
- `src/components/BrowsePage.tsx`
- `src/components/feed/FeedTrackList.tsx`
- `src/components/feed/HistoryTrackList.tsx`
- `src/components/library/PlaylistControls.tsx`
- `src/app/feed/page.tsx`
- `src/app/history/page.tsx`
- `src/app/library/page.tsx`
- `src/app/artist/[id]/page.tsx`
- `src/app/playlist/[id]/page.tsx`
- `src/app/signup/page.tsx`

**Modify: creator and admin surfaces**

- `src/app/admin/layout.tsx`
- `src/app/admin/login/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/admin/profile/page.tsx`
- `src/app/admin/upload/page.tsx`
- `src/app/admin/analytics/page.tsx`
- `src/app/admin/releases/page.tsx`
- `src/app/admin/studio/[id]/page.tsx`
- `src/components/creator/ABComparePlayer.tsx`
- `src/components/creator/AnalysisPanel.tsx`
- `src/components/creator/ReleaseControls.tsx`
- `src/components/creator/StudioControls.tsx`
- `src/components/creator/VersionRow.tsx`

## Theme Mapping

Use these mappings consistently rather than choosing colors per component:

| Current role | Approved light role | Tailwind treatment |
| --- | --- | --- |
| Dark page canvas | White canvas | `bg-canvas text-ink` |
| Dark panel/card | Quiet near-white panel | `bg-panel` or `bg-soft` |
| White divider | Light gray divider | `border-line` |
| White primary text | Ink primary text | `text-ink` |
| Zinc 300–500 secondary text | Neutral gray | `text-muted` |
| Zinc 600–700 tertiary text | Light neutral gray | `text-faint` |
| Rose/brand primary action | Black action | `bg-ink text-white hover:bg-black` |
| Rose/brand tint | Neutral selection | `bg-soft text-ink` |
| Rose/brand focus | Graphite focus | `focus:border-ink focus:ring-ink/15` |
| Colored progress | Black progress | `bg-ink` |

Keep semantic green, amber, and red feedback colors, but use light backgrounds and dark readable text such as `bg-emerald-50 text-emerald-700`, `bg-amber-50 text-amber-800`, and `bg-red-50 text-red-700`.

### Task 1: Add the asset and failing theme audit

**Files:**

- Create: `public/Infini.svg`
- Create: `scripts/check-light-theme.mjs`
- Modify: `package.json`

- [ ] **Step 1: Copy the supplied SVG without altering its paths**

Run:

```bash
cp Infini.svg public/Infini.svg
cmp Infini.svg public/Infini.svg
```

Expected: `cmp` exits 0 and prints nothing.

- [ ] **Step 2: Add the static regression audit**

Create `scripts/check-light-theme.mjs` with:

```js
import { readFileSync } from "node:fs";

const groups = {
  core: [
    "src/app/globals.css",
    "src/app/layout.tsx",
    "src/components/Navbar.tsx",
  ],
  shared: [
    "src/components/ui/Button.tsx",
    "src/components/ui/Input.tsx",
    "src/components/ui/Badge.tsx",
    "src/components/TrackCard.tsx",
    "src/components/TrackDetailPage.tsx",
    "src/components/home/AlbumCarousel.tsx",
    "src/components/player/AudioPlayer.tsx",
    "src/components/profile/ProfileAvatarField.tsx",
    "src/components/DeleteTrackButton.tsx",
    "src/components/social/AddToPlaylistForm.tsx",
    "src/components/social/CommentForm.tsx",
    "src/components/social/FollowButton.tsx",
    "src/components/social/LikeButton.tsx",
  ],
  public: [
    "src/components/HomePage.tsx",
    "src/components/BrowsePage.tsx",
    "src/components/feed/FeedTrackList.tsx",
    "src/components/feed/HistoryTrackList.tsx",
    "src/components/library/PlaylistControls.tsx",
    "src/app/feed/page.tsx",
    "src/app/history/page.tsx",
    "src/app/library/page.tsx",
    "src/app/artist/[id]/page.tsx",
    "src/app/playlist/[id]/page.tsx",
    "src/app/signup/page.tsx",
  ],
  admin: [
    "src/app/admin/layout.tsx",
    "src/app/admin/login/page.tsx",
    "src/app/admin/page.tsx",
    "src/app/admin/profile/page.tsx",
    "src/app/admin/upload/page.tsx",
    "src/app/admin/analytics/page.tsx",
    "src/app/admin/releases/page.tsx",
    "src/app/admin/studio/[id]/page.tsx",
    "src/components/creator/ABComparePlayer.tsx",
    "src/components/creator/AnalysisPanel.tsx",
    "src/components/creator/ReleaseControls.tsx",
    "src/components/creator/StudioControls.tsx",
    "src/components/creator/VersionRow.tsx",
  ],
};

const forbidden = [
  /(?:rose|pink|indigo|violet)-\d+/g,
  /bg-surface-(?:600|700|800|900)(?:\/\d+)?/g,
  /bg-\[#(?:0[0-9a-fA-F]{5}|1[0-9a-fA-F]{5}|2[0-9a-fA-F]{5})\]/g,
  /border-white\//g,
  /bg-white\/\[/g,
  /bg-white\/(?:5|10|15|20)/g,
];

const requested = process.argv[2] ?? "all";
const files = requested === "all" ? Object.values(groups).flat() : groups[requested];
if (!files) throw new Error(`Unknown group: ${requested}`);

const failures = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const pattern of forbidden) {
    for (const match of source.matchAll(pattern)) failures.push(`${file}: ${match[0]}`);
  }
}

const navbar = readFileSync("src/components/Navbar.tsx", "utf8");
if (!navbar.includes('src="/Infini.svg"')) failures.push("Navbar must render /Infini.svg");
if (navbar.includes("Music2")) failures.push("Navbar must not render the old Music2 logo");
if (/OpenTunes<\/|>OpenTunes/.test(navbar)) failures.push("Navbar must not render the OpenTunes wordmark");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Light theme audit passed (${requested}).`);
```

- [ ] **Step 3: Add the package script**

Add to `package.json` scripts:

```json
"theme:check": "node scripts/check-light-theme.mjs"
```

- [ ] **Step 4: Run the audit and verify the expected failure**

Run:

```bash
npm run theme:check -- core
```

Expected: non-zero exit listing current dark tokens and the missing `/Infini.svg` navbar reference. This proves the audit detects the pre-migration state.

### Task 2: Establish theme tokens and replace the app shell

**Files:**

- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Add the semantic palette**

Extend `colors` in `tailwind.config.ts` with:

```ts
canvas: "#ffffff",
panel: "#fafafa",
soft: "#f7f7f7",
line: "#dedede",
ink: "#101010",
muted: "#666666",
faint: "#8a8a8a",
```

Replace the current colored `brand` scale with a neutral scale whose primary action remains `brand-600`:

```ts
brand: {
  50: "#f7f7f7",
  100: "#eeeeee",
  200: "#dedede",
  300: "#c4c4c4",
  400: "#8a8a8a",
  500: "#333333",
  600: "#101010",
  700: "#000000",
  800: "#000000",
  900: "#000000",
  950: "#000000",
},
```

- [ ] **Step 2: Convert global styling to light mode**

In `src/app/globals.css`:

```css
body {
  @apply bg-canvas text-ink;
}

::selection {
  background: #101010;
  color: #ffffff;
}

.glass {
  @apply border border-line bg-white/90 backdrop-blur-2xl;
}
```

Remove the rose/violet body gradients. Change the carousel hover border to `rgba(16, 16, 16, 0.22)`.

- [ ] **Step 3: Remove forced dark mode from the root layout**

Render `<html lang="en">` without `className="dark"`; make the body class `${inter.variable} bg-canvas font-sans text-ink antialiased`.

- [ ] **Step 4: Replace navigation branding and states**

Import `Image` from `next/image`, remove `Music2`, and render only:

```tsx
<Link href="/" aria-label="Infini home" className="flex justify-center px-2">
  <Image src="/Infini.svg" alt="Infini" width={52} height={52} priority />
</Link>
```

Use the same asset at 36×36 in the mobile header. Convert the desktop rail to `border-line bg-soft/95`, mobile header to `border-line bg-white/95`, active nav to `bg-ink text-white`, inactive nav to `text-muted hover:bg-white hover:text-ink`, and account/search controls to matching neutral states.

- [ ] **Step 5: Verify the core group**

Run:

```bash
npm run theme:check -- core
```

Expected: `Light theme audit passed (core).`

### Task 3: Migrate shared primitives, cards, carousel, and player

**Files:** all files listed under **Modify: shared UI and playback**.

- [ ] **Step 1: Convert shared primitives**

Apply the theme mapping to `Button`, `Input`, and `Badge`. Primary buttons use `bg-ink text-white`; secondary buttons use `bg-soft text-ink hover:bg-[#eeeeee]`; ghost buttons use `text-muted hover:bg-soft hover:text-ink`; inputs use `border-line bg-white text-ink placeholder:text-faint focus:border-ink focus:ring-ink/15`; default badges use `bg-soft text-ink`.

- [ ] **Step 2: Convert reusable content and social controls**

Apply `bg-panel`, `border-line`, `text-ink`, `text-muted`, and `text-faint` to track cards, track detail, avatar field, delete control, playlist selector, comment form, follow button, and like button. Retain black overlays on album artwork because they are image affordances, not page-theme surfaces.

- [ ] **Step 3: Convert the carousel without changing its behavior**

Use a white section with `border-line`, remove the rose/violet radial gradients, use white cards with gray borders and a restrained shadow, use ink headings/actions, gray metadata, and black pagination. Preserve `IntersectionObserver`, snap scrolling, reduced motion, queue creation, and the existing copy exactly.

- [ ] **Step 4: Convert player and queue windows**

Use `border-line bg-white/95 shadow-black/10`, ink progress, black play/post controls, neutral active states, and accessible light error/success treatments. Keep the floating geometry, seek input, queue behavior, comment behavior, and responsive button visibility unchanged.

- [ ] **Step 5: Verify shared components**

Run:

```bash
npm run theme:check -- shared
```

Expected: `Light theme audit passed (shared).`

### Task 4: Migrate public product surfaces

**Files:** all files listed under **Modify: public product surfaces**.

- [ ] **Step 1: Convert discovery and history surfaces**

Apply the mapping to `HomePage`, `BrowsePage`, feed/history lists, and their route headers. Use open white layouts, light dividers, white/panel cards, ink headings, neutral helper copy, and black primary controls. Do not alter queries, filtering, sorting, carousel data, or playback calls.

- [ ] **Step 2: Convert library, artist, and playlist surfaces**

Use the same semantic tokens for empty states, playlist cards, artist header, follow/like actions, and list rows. Preserve every form action, authorization boundary, link, and conditional rendering branch.

- [ ] **Step 3: Convert signup**

Use a white canvas, `bg-panel` form container, gray border, ink heading, neutral labels/input copy, and black submit action. Keep validation and navigation unchanged.

- [ ] **Step 4: Verify public surfaces**

Run:

```bash
npm run theme:check -- public
```

Expected: `Light theme audit passed (public).`

### Task 5: Migrate creator and admin surfaces

**Files:** all files listed under **Modify: creator and admin surfaces**.

- [ ] **Step 1: Convert the admin shell and entry screens**

Update the admin layout, login, overview, profile, and upload surfaces to white/panel backgrounds, gray borders, ink headings and controls, neutral metadata, and accessible semantic feedback colors. Preserve redirects, form actions, multipart uploads, metadata parsing, and status text.

- [ ] **Step 2: Convert analytics, releases, and studio routes**

Replace dark panels and brand tints with panel/soft surfaces and ink/neutral hierarchy. Render charts and meters in grayscale; keep their values, dimensions, and labels unchanged.

- [ ] **Step 3: Convert creator components**

Apply the same palette to comparison players, analysis panels, release controls, studio controls, and version rows. Preserve audio synchronization, selection states, inputs, and release state transitions.

- [ ] **Step 4: Verify admin surfaces**

Run:

```bash
npm run theme:check -- admin
```

Expected: `Light theme audit passed (admin).`

### Task 6: Complete automated and visual verification

**Files:**

- Verify: all files in the audit
- Verify: `public/Infini.svg`

- [ ] **Step 1: Run the complete theme audit**

```bash
npm run theme:check
```

Expected: `Light theme audit passed (all).`

- [ ] **Step 2: Check touched files for whitespace errors**

Run `git diff --check --` with the exact app, component, config, script, package, and SVG paths changed in Tasks 1–5. Expected: no output and exit 0.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: Next.js compilation, type checks, and page generation complete successfully.

- [ ] **Step 4: Run browser QA at desktop and mobile sizes**

Start `npm run dev`, then inspect at least `/`, `/browse`, `/library`, `/signup`, `/admin/login`, and one representative creator route available in the seeded session. Check 1440×900 and 390×844 viewports.

Expected:

- Infini SVG appears by itself in desktop and mobile navigation.
- Canvas and panels are white/near-white; no dark page shells remain.
- No rose, violet, pink, or indigo brand accent remains.
- Album artwork remains the main source of color.
- Text, borders, focus rings, hover states, player, carousel, and forms remain readable and operational.
- No horizontal overflow or mobile navigation collision appears.

- [ ] **Step 5: Inspect screenshots against the approved concept**

Capture desktop and mobile screenshots, inspect them alongside `.superpowers/brainstorm/65925-1784825703/content/theme-directions.html`, and record a fidelity ledger covering logo treatment, canvas/panels, typography hierarchy, borders, controls, album-art color, responsive layout, and interaction states. Fix all material drift before completion.

## Repository Safety

The checkout begins with extensive staged and unstaged user changes. Do not use `git add .`, broad commits, resets, checkouts, or cleaning commands. Verification and implementation must preserve those changes. Only create a commit if the user explicitly asks for one; when doing so, inspect the index first and use exact pathspecs.
