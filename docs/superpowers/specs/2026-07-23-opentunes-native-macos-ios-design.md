# OpenTunes Native macOS and iPhone Design

Date: 2026-07-23  
Status: Approved in conversation

## Summary

OpenTunes will gain a fully native listener application for iOS 26 and macOS 26. One Xcode project will contain both SwiftUI app targets and shared modules for models, networking, authentication, playback, downloads, and listener features. The existing Next.js web application remains functional and remains the home of Creator Studio in the first native release.

The OpenTunes application and PostgreSQL database will be self-hosted on an internet-connected PC with Docker Compose. Cloudflare Tunnel will expose only the web/API service over HTTPS without public router ports. Cloudflare R2 will hold audio, artwork, and avatars. Native clients will use a stable `/api/v1` JSON API and native access/refresh-token authentication rather than React Server Actions or NextAuth browser cookies.

The native interface uses a fixed light appearance. `Infini.svg` is the application mark. The Mac sidebar displays the mark without an "OpenTunes" title. iPhone uses a leading sidebar/menu button rather than a tab bar. Mini-player surfaces float at the bottom of the content on both platforms. Liquid Glass is limited to navigation, search, playback, and transient controls. A macOS-only AppKit bridge provides an optional always-on-top mini-player panel.

## Goals

- Deliver native discovery, search, playback, library, playlists, feed, history, likes, comments, follows, permitted downloads, and account flows on iPhone and Mac.
- Preserve the existing web application and its Creator Studio.
- Introduce a stable, versioned native API and secure native authentication.
- Self-host application logic and PostgreSQL on a PC while using R2 for durable media.
- Produce a verified, archive-ready iPhone project and export a signed IPA when Apple signing credentials are available.
- Produce an archived macOS application with an equivalent signing/notarization handoff for external distribution.
- Keep SwiftUI as the source of truth and restrict AppKit to one capability that SwiftUI cannot express precisely.

## Non-goals

- Rebuilding Creator Studio, uploads, releases, analytics, profile editing, audio analysis, enhancement, or version management in native UI during the first release.
- Wrapping the web application in `WKWebView` as the primary native experience.
- Supporting iOS or macOS versions older than 26.
- Providing permanent offline copies of tracks whose creators disabled downloads.
- Making the application usable for new network activity while the self-hosted PC/API is offline.
- Exposing PostgreSQL, R2 credentials, or internal storage paths to native clients.

## Existing-project constraints

The target worktree is on `convert-webapp-macos-ios` and begins from an empty initial commit. The current web implementation exists in the sibling `music-upload-platform` worktree and contains substantial generated and uncommitted state. Implementation must first establish an auditable web-source baseline. It must not copy the sibling worktree wholesale or import generated build outputs, dependencies, local databases, uploads, or secrets.

The web application currently uses Next.js 15, Prisma, SQLite, NextAuth credentials, React Server Actions, local filesystem media, and server-rendered Prisma queries. Range-capable stream and download routes are reusable concepts, but most catalog, library, and social behavior has no stable JSON API.

The development Mac has Xcode 26.6, Swift 6.3.3, and iOS/macOS 26 SDKs. It currently has no installed iOS simulator runtime, valid code-signing identity, provisioning profile, or configured Xcode account. Generic builds are possible now; simulator validation and signed IPA export require those external prerequisites.

## System architecture

### Runtime topology

1. The iPhone app, Mac app, and existing web client use a public HTTPS hostname.
2. Cloudflare Tunnel carries HTTPS traffic to the Next.js web/API container on the user's PC.
3. The Next.js application calls a shared backend service layer for authorization, validation, and business behavior.
4. PostgreSQL stores accounts, device sessions, catalog data, playlists, social state, and playback events. It is reachable only on the private Docker network.
5. Cloudflare R2 stores audio, artwork, avatars, and downloadable media. Only server-side code holds R2 credentials.
6. API DTOs contain public or short-lived absolute media URLs. They never expose raw Prisma rows or internal object keys.

If the PC or home connection is unavailable, R2 may still contain media, but authentication, catalog updates, social activity, and new stream authorization are unavailable. Completed permitted downloads and cached metadata remain usable.

### Repository and deployment layout

The repository will contain:

- The existing Next.js application and shared backend service layer.
- Versioned API routes under `src/app/api/v1`.
- Docker Compose configuration for the web/API service, PostgreSQL, and `cloudflared`.
- R2-compatible storage and migration adapters.
- One Xcode project with iOS and macOS app targets.
- Shared Swift packages or framework targets owned by that Xcode project.
- Platform-specific app shells, assets, capabilities, and entitlements.

PostgreSQL and `cloudflared` are local containers. R2 is external and S3-compatible. Environment secrets are injected at runtime and excluded from source control. A release build reads its HTTPS API hostname from a checked-in build-setting key whose value is supplied by an environment-specific `.xcconfig`; debug builds may override it without changing source.

## Apple application structure

### Shared modules

- `OpenTunesCore`: DTOs, domain models, pagination, shared errors, identifiers, and formatting.
- `OpenTunesAPI`: `URLSession` transport, request construction, decoding, retry policy, request IDs, and token-refresh coordination.
- `OpenTunesAuth`: account state, registration/login/logout, role handling, Keychain abstraction, and device-session lifecycle.
- `OpenTunesPlayback`: the single `AVQueuePlayer`, queue state, repeat/shuffle, seeking, Now Playing metadata, remote commands, telemetry, and playback errors.
- `OpenTunesDownloads`: eligible-download state, background transfers, local file indexing, integrity checks, and removal.
- Feature modules: Home, Browse/Search, Track, Artist, Library, Playlist, Feed, History, Social, Downloads, Account, and Now Playing.

The iOS and macOS shells compose navigation and platform adapters. They do not duplicate business or playback state.

### Navigation and visual system

The application uses a fixed light appearance on both platforms. Artwork remains opaque and carries most product color. Rose is reserved for selected navigation, active playback, and other semantic emphasis. Standard lists, forms, buttons, sliders, alerts, and download controls use system styles and remain high contrast.

On macOS:

- A single `NavigationSplitView` contains Home, Browse, Feed, Library, Playlists, History, and Downloads.
- The sidebar header shows only `Infini.svg`, with no product-title text.
- Global search belongs to the split-view toolbar.
- Account actions live in a toolbar avatar/menu and settings.
- Track, artist, playlist, history, and feed selections appear in the detail column.
- The queue appears as an inspector and can also be represented by the optional floating panel.
- Playback, seeking, next/previous, mute, shuffle, repeat, search, and panel visibility receive native commands and keyboard shortcuts.

On iPhone:

- A compact `NavigationSplitView` or equivalent system sidebar presentation supplies a leading menu button.
- The sidebar contains Home, Browse, Library, Feed, History, and Downloads.
- Selecting a destination closes the sidebar and preserves that destination's navigation state.
- Account/profile actions live in the trailing toolbar item.
- The player floats above the bottom safe area and is not attached to a tab bar.
- Tapping the mini-player presents full Now Playing; queue and timestamp-comment composition use sheets.

Liquid Glass is used for system sidebars, toolbars, global search, the floating mini-player, the queue surface, the timestamp-comment composer, and small controls over hero artwork. Nearby custom glass controls share one `GlassEffectContainer`. Artwork grids, track rows, forms, analytics-like content, destructive confirmations, and processing/error states remain plain native surfaces.

## AppKit boundary

### Capability gap

SwiftUI does not precisely expose a non-activating, always-on-top utility panel with the desired desktop mini-player lifecycle and placement behavior.

### Smallest bridge

A macOS-only `NSPanelController` owns one `NSPanel` and hosts the shared SwiftUI mini-player view. No screen is rewritten in AppKit, no global `NSWindow` is retained, and no duplicate player model is created.

### Data ownership

- SwiftUI/shared playback code owns current track, queue, time, play state, commands, artwork, and errors.
- AppKit owns only panel creation, window level, activation policy, visibility, positioning, and lifecycle callbacks.
- The hosted SwiftUI view observes the same `PlaybackController` used by the main window.

### Lifecycle risks

Verification must cover duplicate panel prevention, SwiftUI view refresh, closing versus continuing playback, application activation, multiple displays, safe-area placement, and restoration. If a standard SwiftUI window can meet the final behavior without loss, the bridge is removed rather than expanded.

## API contract

All native routes live under `/api/v1`. Responses are JSON DTOs with stable field names and absolute URLs. Collection routes use cursor pagination. Errors use a common envelope containing a stable error code, safe message, request ID, optional field, and optional retry interval.

Required route groups:

- `auth/register`, `auth/login`, `auth/refresh`, `auth/logout`, and `auth/me`.
- `home`, `tracks`, `tracks/{id}`, `artists/{id}`, and public `playlists/{id}`.
- Authenticated `me/library`, `me/feed`, `me/history`, and `me/downloads` metadata.
- Track like/unlike and comment list/create/delete operations.
- Artist follow/unfollow operations.
- Playlist list/create/update/delete and track membership operations.
- Playback-event creation/update with native `ios` and `macos` sources.
- Stream authorization and permitted-download authorization.

Mutations that may be retried support idempotency keys. Search and browsing happen server-side rather than loading the full catalog into a client. Stream and download URLs are short lived when authorization is required. Official downloads are issued only when `allowDownload` is true.

## Authentication and security

Native clients support email/password registration and login while preserving listener, creator, and administrator roles. Creator and administrator accounts receive the native listener feature set; Creator Studio remains a web destination.

- Access tokens are short lived.
- Refresh tokens are opaque, device specific, rotating, and stored hashed in PostgreSQL.
- Native refresh tokens are stored in Keychain.
- A request that receives an authentication failure may coordinate one token refresh and retry once.
- Refresh reuse, revocation, or expiry clears the native session and requires login.
- Logout revokes the current device session.
- Passwords continue to use a strong adaptive hash.
- Rate limits cover registration, login, refresh, comments, and anonymous playback events.
- R2 credentials, database credentials, Cloudflare Tunnel credentials, and signing material are never compiled into an app.

The legacy standalone `Admin` identity is consolidated into role-based `User` records before native identity depends on user IDs. The existing web NextAuth session remains supported, but cookie and bearer identities resolve through one shared authorization helper.

## Web compatibility and backend services

React Server Actions and API routes call shared service functions for authorization, validation, and mutations. Native clients never call the generated Server Action protocol. Server-rendered web pages may continue to query read models directly initially, but mutations and authorization must not fork into separate web and native rules.

The storage layer becomes an interface with R2 and local test implementations. Creator Studio continues to upload through the web application; the server writes accepted media and artwork to R2. API DTO construction converts object keys into appropriate absolute or signed URLs.

A one-time migration path exports existing SQLite data into PostgreSQL, reconciles the legacy `Admin`, uploads local audio and images to R2, rewrites internal locators, and verifies row/object counts. Migration is explicit, restartable, and dry-run capable. Local databases, media, build outputs, and secrets are never committed.

## Playback and downloads

`PlaybackController` is the only playback source of truth. It owns the queue, current item, time observation, shuffle/repeat, seeking, and transition errors. It integrates with `MPNowPlayingInfoCenter` and `MPRemoteCommandCenter`; iOS also configures background audio. Starting a track constructs a contextual queue but does not automatically show it.

Permitted downloads use background `URLSession` transfers and app-managed storage. The local index records track identity, metadata snapshot, artwork, file size, checksum/integrity state, and download date. Expired signed URLs are refreshed through the API before resuming. Deleting a download removes local media while preserving the user's library/social state.

Only `allowDownload` tracks receive permanent offline files. Ordinary streaming may use transient system buffering but is not represented as an offline entitlement.

When offline:

- Completed permitted downloads play normally.
- Cached metadata and artwork may render with a visible offline indicator.
- Likes, comments, follows, playlist changes, and new streams fail with an actionable connectivity message; they are not silently queued.
- Qualified playback telemetry is queued with its idempotent playback ID and synchronized when the API returns.

## Error handling and observability

Native UI distinguishes authentication expiry, permission denial, missing content, offline state, rate limiting, server errors, R2 transfer failures, invalid media, and local storage exhaustion. Errors appear at the feature boundary that can resolve them. The global player preserves the queue when a recoverable stream fails and offers retry or skip.

Every API response carries or exposes a request ID. Server logs use structured records without access tokens, refresh tokens, passwords, or presigned URL query strings. Health endpoints report application, PostgreSQL, and R2 reachability without exposing secrets. Docker configuration includes restart policies and documented database backups/restores. Cloudflare Tunnel and R2 secret rotation are documented.

## Verification strategy

### Apple tests

- Unit tests cover DTO decoding, pagination, structured errors, refresh concurrency, Keychain abstraction, queue transitions, repeat/shuffle, telemetry idempotency, download eligibility, and offline state.
- Network tests use controlled `URLProtocol` responses and fixtures.
- Playback tests isolate an engine protocol from `AVQueuePlayer` where deterministic state testing is required.
- SwiftUI tests cover registration/login, sidebar navigation, search, track/artist/playlist detail, library, feed, history, downloads, and Now Playing.
- macOS checks cover menus, keyboard commands, window resizing, the `NSPanel`, multiple displays, and restoration.
- Accessibility checks cover VoiceOver labels, keyboard navigation, contrast, Dynamic Type, Reduce Motion, and reduced transparency.

### Backend tests

- Service tests cover authorization and validation shared by web and native entry points.
- API contract tests cover DTO shape, pagination, error envelopes, idempotency, and role boundaries.
- Security tests cover refresh rotation/reuse rejection, revocation, rate limits, object-key isolation, expired media URLs, and download permissions.
- Disposable PostgreSQL and S3-compatible test services verify persistence and storage adapters.
- Migration tests compare source/destination counts and media integrity.
- The existing web production build remains a release gate.

### Release gates

1. Web build, backend tests, and native unit tests pass.
2. Docker Compose starts from documented configuration and health checks pass.
3. Generic iOS and macOS builds compile with signing disabled.
4. An iOS 26 simulator runtime is installed and critical flows pass in the simulator.
5. Critical macOS flows and the AppKit panel pass on macOS 26.
6. The Cloudflare Tunnel hostname, R2 access, backup, restore, and secret-rotation procedures pass smoke tests.
7. With an Apple team, certificate, and provisioning profile configured outside source control, the iOS target archives and exports a signed IPA.
8. The macOS target archives; external distribution signing and notarization complete when the corresponding Developer ID credentials are available.

An unsigned generic build is never reported as an IPA. When credentials are unavailable, delivery stops at a verified archive-ready project plus a precise signing handoff.

## Acceptance criteria

- iOS 26 and macOS 26 apps present the approved light, Infini-branded navigation and floating playback UI.
- Native users can register, sign in, refresh sessions, sign out, and preserve roles securely.
- Users can discover, search, stream, queue, like, comment, follow, manage playlists, view feed/history/library, and download eligible tracks.
- Eligible downloads play without the server; disallowed tracks never become permanent offline files.
- Web Creator Studio and existing web listener flows remain operational.
- The self-hosted Docker stack is reachable through Cloudflare Tunnel while PostgreSQL remains private.
- Audio and artwork are stored in R2 and never require R2 credentials in native apps.
- SwiftUI remains the playback source of truth; AppKit owns only floating-panel mechanics.
- Tests and release gates provide evidence for every completion claim.
- Signed IPA and macOS distribution artifacts are produced only when valid external signing credentials are supplied.

## External inputs required for final distribution

Implementation and unsigned verification can proceed without these inputs. Final internet and store distribution require:

- A Cloudflare account, R2 bucket, Tunnel, and HTTPS hostname controlled by the user.
- Runtime secrets for PostgreSQL, application signing, refresh-token hashing, Cloudflare Tunnel, and R2.
- An Apple Developer team, unique production bundle identifiers, signing certificates, and provisioning profiles.
- An installed iOS 26 simulator runtime for local simulator validation.

These values remain environment or signing configuration, not committed source.
