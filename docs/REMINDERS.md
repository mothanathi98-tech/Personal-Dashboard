# Reminders

- Triggers on tasks, events and reviews create and re-sync rows in `reminder_jobs` (one per channel: `in_app`, `email`). Editing or completing the source cancels pending jobs and queues new ones.
- `pg_cron` job `send-reminders` runs every minute and calls the edge function `send-reminders` through `pg_net`.
- Auth: the function checks `Authorization: Bearer <secret>` against the Vault secret `reminder_worker_secret` through `get_worker_secret()` (service_role only). The secret is generated inside the database and never leaves it.
- Claiming uses `claim_reminder_jobs_for` with `for update skip locked`; jobs stuck in `processing` for 10 minutes are reclaimed.
- In-app: inserts into `notifications`, unique per `reminder_job_id`, so a retry cannot duplicate.
- Email: recipient comes from `auth.users`, never from the request. Provider code is in `supabase/functions/send-reminders/providers.ts` (Resend). Retries on network, 429 and 5xx; other errors fail the job.
- Without `RESEND_API_KEY` and `REMINDER_FROM_EMAIL`, only in-app jobs are claimed; email jobs stay pending. `REMINDER_DRY_RUN=true` marks email jobs sent without sending.
- Verified: unauthenticated call is rejected; cron calls return 200 with `claimed: 0` on an empty queue. End-to-end delivery of a real reminder is not yet verified because no owner user exists.
