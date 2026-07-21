# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 15 application using the App Router, Prisma, SQLite, NextAuth, and Tailwind CSS. Route files live under `src/app`, reusable UI and page components live under `src/components`, and shared server utilities live under `src/lib`. Prisma schema and seed data are in `prisma/`. Public uploads and static assets should be stored under `public/`, with uploaded audio and covers expected at `public/uploads/audio` and `public/uploads/covers`.

## Build, Test, and Development Commands

- `npm run dev`: starts the local Next.js development server.
- `npm run build`: builds the production app and runs framework/type checks.
- `npm run start`: serves a previously built production app.
- `npm run db:push`: syncs `prisma/schema.prisma` to the configured database.
- `npm run db:seed`: seeds local data with `prisma/seed.ts`.
- `npm run db:studio`: opens Prisma Studio for database inspection.

There is currently no `npm test` script. Add one when introducing a test framework.

## Coding Style & Naming Conventions

Use TypeScript, React server components by default, and client components only when browser state, events, or hooks are required. Keep indentation at two spaces. Name React components in `PascalCase`, helper functions and variables in `camelCase`, and route directories using lowercase URL segments such as `src/app/artist/[id]/page.tsx`. Prefer existing UI primitives from `src/components/ui` and shared helpers from `src/lib` before adding new abstractions.

## Testing Guidelines

No test framework is configured yet. For new tests, prefer colocated component or unit tests near the code they cover, using names like `TrackCard.test.tsx` or `actions.test.ts`. Prioritize coverage for server actions, authentication flows, Prisma queries, and creator/social features because these affect user data.

## Commit & Pull Request Guidelines

The current history only shows an initial commit, so use clear imperative commit messages such as `Add playlist management` or `Fix upload validation`. Pull requests should include a concise summary, screenshots for UI changes, notes about database schema changes, and verification steps run locally. Link related issues when available.

## Security & Configuration Tips

Keep secrets in `.env` and do not commit local databases or generated upload files unless they are intentional fixtures. After changing Prisma models, run `npm run db:push` and regenerate/check Prisma Client through the normal build flow.
