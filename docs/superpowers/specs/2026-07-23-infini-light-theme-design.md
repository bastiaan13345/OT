# Infini Light Theme Design

## Goal

Replace the current OpenTunes word-and-icon branding with the provided `Infini.svg` mark and convert the entire product from a dark rose/violet theme to a light editorial monochrome theme.

## Brand Treatment

- Use only the Infini SVG in desktop and mobile navigation; do not place an `OpenTunes` wordmark beside it.
- Preserve the SVG artwork without redrawing or recoloring its black paths.
- Size the logo for clear recognition without overpowering navigation: approximately 44–52 px on desktop and 32–36 px on mobile.
- Copy the asset into `public/` so Next.js can serve it as a stable static brand asset.

## Visual System

The selected direction is editorial monochrome:

- Page canvas: pure white (`#ffffff`).
- Sidebar and quiet surfaces: cool near-white (`#f7f7f7` to `#fafafa`).
- Primary text and actions: ink black (`#101010`).
- Secondary text: neutral gray (`#666666`).
- Disabled or tertiary text: light neutral gray (`#8a8a8a`).
- Borders and dividers: subtle gray (`#dedede` to `#e5e5e5`).
- Hover and selected surfaces: light gray (`#eeeeee` to `#f2f2f2`).
- Focus treatment: visible black or graphite rings with sufficient contrast.

Album covers, avatars, and other user-provided music artwork are the only prominent sources of color. The theme will not introduce a replacement accent color.

## Application Scope

Apply the visual system across the complete application, including:

- Root layout and global body styling.
- Desktop sidebar and mobile header.
- Home, browse, feed, library, history, artist, track, and playlist views.
- Authentication and creator/admin screens.
- Track cards, carousel, social controls, forms, badges, and shared buttons.
- The persistent audio player and creator playback tools.

Existing information architecture, page layouts, copy, routes, data loading, playback, uploads, social actions, and creator workflows remain unchanged.

## Implementation Structure

- Define reusable light-theme colors in Tailwind and global CSS rather than introducing isolated one-off colors.
- Remove the forced `dark` class and dark body utilities from the root layout.
- Update shared primitives first, then shared navigation/player/cards, then route-specific surfaces.
- Keep React server/client component boundaries unchanged unless a direct technical need arises.
- Use the static SVG through the existing Next.js asset conventions without adding a client-side logo component.

## Interaction and Accessibility

- Preserve every existing hover, selected, disabled, loading, and focus state with a light-theme equivalent.
- Ensure text and interactive controls meet WCAG AA contrast expectations.
- Keep visible keyboard focus treatments.
- Preserve reduced-motion behavior and existing carousel/player interactions.
- Avoid low-contrast white-on-white controls or borders that disappear on the new canvas.

## Error Handling

The redesign changes presentation only. Existing error messages and validation behavior stay intact, but error states must remain visibly distinct on light surfaces using accessible red text, borders, and backgrounds.

## Verification

- Run a production build to cover framework and TypeScript checks.
- Inspect desktop and mobile layouts in a browser.
- Verify the logo loads in both navigation variants.
- Check representative public, authentication, creator, form, card, carousel, and player surfaces.
- Confirm no dark canvas, rose/violet brand accents, unreadable text, invisible borders, overflow, or unintended functional changes remain.
