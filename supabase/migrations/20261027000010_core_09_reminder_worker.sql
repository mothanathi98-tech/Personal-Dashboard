-- Reminder worker plumbing: channel-aware claiming, vault-held worker secret, per-minute pg_cron schedule.
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.claim_reminder_jobs_for(p_limit integer, p_channels text[]) returns setof public.reminder_jobs
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.reminder_jobs j
     set status = 'processing', attempt_count = j.attempt_count + 1, last_attempt_at = now()
   where j.id in (
     select id from public.reminder_jobs
      where channel = any (p_channels)
        and ((status = 'pending' and next_attempt_at <= now())
          or (status = 'processing' and last_attempt_at < now() - interval '10 minutes'))
      order by next_attempt_at
      limit greatest(p_limit, 1)
      for update skip locked)
  returning j.*;
end $$;
revoke all on function public.claim_reminder_jobs_for(integer, text[]) from public, anon, authenticated;
grant execute on function public.claim_reminder_jobs_for(integer, text[]) to service_role;

-- The worker secret is generated inside the database and never leaves it except to the cron job and the worker.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'reminder_worker_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'reminder_worker_secret');
  end if;
end $$;

create or replace function public.get_worker_secret() returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'reminder_worker_secret'
$$;
revoke all on function public.get_worker_secret() from public, anon, authenticated;
grant execute on function public.get_worker_secret() to service_role;

select cron.schedule('send-reminders', '* * * * *', $job$
  select net.http_post(
    url := 'https://rscoevjfiithvpwfumvb.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || public.get_worker_secret()),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000)
$job$);
