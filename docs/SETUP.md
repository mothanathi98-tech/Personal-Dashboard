# Setup

This app uses its own Supabase project. It must never share a project, credentials, repository, Vercel project or domain with any other product.

## 1. Supabase

Project: `command-centre`, ref `rscoevjfiithvpwfumvb`, region eu-west-2. All migrations in `supabase/migrations/` are applied remotely, except `delete_my_account` (see below).

## 2. Create the owner (one time)

Public registration is disabled by a database trigger. The only allowed email is the one in `private.app_owner`, which is empty until you seed it.

1. In the Supabase SQL editor run: `insert into private.app_owner(email) values ('<your email>');`
2. In Dashboard > Authentication > Users, choose "Add user" and set your email and a strong password.
3. Set `OWNER_EMAIL` to the same address in the app environment.

## 3. Environment variables and secrets

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | App environment | Supabase project URL; safe to expose as the project endpoint |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | App environment | Supabase publishable key; database access must still be protected by RLS |
| `OWNER_EMAIL` | App environment, server-side use | Login allow-list |
| `SUPABASE_SECRET_KEY` | App environment, server only | Required for account deletion only |
| `RESEND_API_KEY` | Supabase Edge Function secrets | Sends email reminders through Resend |
| `REMINDER_FROM_EMAIL` | Supabase Edge Function secrets | Sender address for email reminders |

The root `.env.example` documents the app environment variables. Reminder email values belong in the Supabase Edge Function environment, not the Next.js app environment. The worker authentication secret is stored in Supabase Vault by the database setup.

Enter real secrets in the relevant Vercel or Supabase settings. Never commit them or paste them into chat. `.env.local` is git-ignored. Do not put secret values in variables prefixed with `NEXT_PUBLIC_`.

## 4. Auth redirect

In Supabase Auth > URL configuration, add `<app origin>/auth/callback` to the allowed redirect URLs so password-reset links work.

## 5. Deploy

Use this repository as the source for a dedicated Vercel project for Command Centre. Do not connect it to a Vercel project used by another product. Set the app environment variables above in the Vercel project, then deploy. Configure reminder email secrets separately in Supabase if email reminders are required.

For local browser tests, run `npm run build` before `npm run e2e`. To run the tests against a deployed URL, set `E2E_BASE_URL`. Owner-session tests also need `E2E_EMAIL` and `E2E_PASSWORD`.

## Account deletion

`delete_my_account` is not applied as a migration. Deletion runs through the admin client in `features/settings/actions.ts` and needs `SUPABASE_SECRET_KEY`. Until the key is set, deletion fails closed with an error.
