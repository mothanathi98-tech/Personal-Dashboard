# Architecture

- Server components and Server Actions; no client-side database access for writes. `proxy.ts` redirects unauthenticated requests to `/login`.
- Every table has `user_id` and RLS with `(select auth.uid())`. Cross-table links use composite `(user_id, id)` foreign keys so a row can never reference another user's data.
- Single-user guard: trigger on `auth.users` allows only emails in `private.app_owner`.
- Dates: tasks and events use timestamps; review dates are date-only. Default timezone Africa/Johannesburg, per-user in settings.
- Recurrence: `complete_task` is idempotent; a partial unique index on (series, occurrence) prevents duplicate next occurrences.
- Project progress: weighted milestones, computed in the `project_progress` view.
- Notes: generated `fts` columns with GIN indexes; optimistic concurrency via `expected_updated_at`.
- Search: `global_search` RPC across tasks, projects, ideas, notes, meetings, reviews.
- Archive keeps data and hides it; delete removes it. Deleting a parent sets child links to null where the child is independently useful.
- Export: `/export` (JSON or CSV, spreadsheet-formula injection guarded), owner only.

## Known limitations

- `pg_net` is installed in `public` (Supabase advisor warning); the extension does not support relocation.
- Account deletion needs `SUPABASE_SECRET_KEY`.
- Owner-session Playwright flows are skipped without test credentials.
- No fabricated data: empty states are shown until real records exist.
