# Setup

This app uses its own Supabase project. It must never share a project, credentials, repository, Vercel project or domain with any other product.

## 1. Supabase

Project: `command-centre`, ref `rscoevjfiithvpwfumvb`, region eu-west-2. All migrations in `supabase/migrations/` are applied remotely, except `delete_my_account` (see below).

## 2. Create the owner (one time)

Public registration is disabled by a database trigger. The only allowed email is the one in `private.app_owner`, which is empty until you seed it.

1. In the Supabase SQL editor run: `insert into private.app_owner(email) values ('<your email>');`
2. In Dashboard > Authentication > Users, choose "Add user" and set your email and a strong password.
3. Set `OWNER_EMAIL` to the same address in the app environment.

## 3. Environment variables

| Name | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | app | project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | app | publishable key |
| `OWNER_EMAIL` | app, server only | login allow-list |
| `SUPABASE_SECRET_KEY` | app, server only | required for account deletion only |
| `RESEND_API_KEY`, `REMINDER_FROM_EMAIL` | edge function secrets | email reminders |

Enter secrets in the Vercel or Supabase dashboard. Never commit them or paste them into chat. `.env.local` is git-ignored; `.env.example` lists names only.

## 4. Auth redirect

In Supabase Auth > URL configuration, add `<app origin>/auth/callback` to the allowed redirect URLs so password-reset links work.

## 5. Deploy

Create a new GitHub repository and a new Vercel project for this app only. Import the repository, set the variables above, deploy. Run `npm run e2e` against the deployed URL with `E2E_BASE_URL`.

## Account deletion

`delete_my_account` is not applied as a migration. Deletion runs through the admin client in `features/settings/actions.ts` and needs `SUPABASE_SECRET_KEY`. Until the key is set, deletion fails closed with an error.
