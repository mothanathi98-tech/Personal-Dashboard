# Command Centre

Private, single-user productivity app: tasks, projects, brainstorm/ideas, notes, calendar, meetings, reviews, reminders, global search, export.

Stack: Next.js 16 (App Router, strict TypeScript), Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron), Vitest, Playwright.

- Setup and deployment: [docs/SETUP.md](docs/SETUP.md)
- Reminder worker: [docs/REMINDERS.md](docs/REMINDERS.md)
- Architecture, decisions, limitations: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Commands

    npm run dev          # local dev
    npm run typecheck
    npm run lint
    npm test             # Vitest unit tests
    npm run build
    npm run e2e          # Playwright; owner flows need E2E_EMAIL / E2E_PASSWORD, otherwise skipped

If the bundled Playwright browser version differs from the installed one, set `PW_CHROMIUM_PATH` to a Chromium binary.
