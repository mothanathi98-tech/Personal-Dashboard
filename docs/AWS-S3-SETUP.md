# AWS S3 storage setup

The Files page uses a private S3 bucket. It scopes every object to `users/<Supabase user id>/`, and the app only lists, downloads, and deletes objects under the signed-in owner's prefix.

## Cloudflare Worker variables and secrets

Set these on the `personal-dashboard` Worker:

- `AWS_S3_BUCKET_NAME=my-files-buckets0-2027` (ordinary variable)
- `AWS_REGION=eu-north-1` (ordinary variable)
- `AWS_ACCESS_KEY_ID` (secret)
- `AWS_SECRET_ACCESS_KEY` (secret)

If using temporary AWS credentials, also set `AWS_SESSION_TOKEN` as a secret.

Never prefix AWS credentials with `NEXT_PUBLIC_`, commit them, or paste them into chat.

## IAM permissions

Create a dedicated IAM user/access key for this app, not root account credentials. Attach a policy restricted to this bucket and the app's object prefix. A minimum policy can grant:

- `s3:ListBucket` on `arn:aws:s3:::my-files-buckets0-2027`, conditioned on `s3:prefix` values `users/*`
- `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` on `arn:aws:s3:::my-files-buckets0-2027/users/*`

Keep Block Public Access enabled. The app creates short-lived (5-minute) signed download URLs. Uploads are limited to 8 MB.

## Cloudflare build

Workers Builds installs the OpenNext Cloudflare adapter and AWS SDK v3 at build time before building. The repository includes `open-next.config.ts` for the adapter.
