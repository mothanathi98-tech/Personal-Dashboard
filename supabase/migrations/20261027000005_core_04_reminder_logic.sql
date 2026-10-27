create or replace function private.queue_reminder(p_user uuid, p_task uuid, p_event uuid, p_review uuid, p_kind text, p_at timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
declare email_on boolean; ch text;
begin
  if p_at is null or p_at <= now() then return; end if;
  select coalesce(email_reminders_enabled, true) into email_on from public.user_preferences where user_id = p_user;
  foreach ch in array case when coalesce(email_on, true) then array['in_app','email'] else array['in_app'] end loop
    insert into public.reminder_jobs (user_id, task_id, event_id, review_id, kind, reminder_at, channel, next_attempt_at, idempotency_key)
    values (p_user, p_task, p_event, p_review, p_kind, p_at, ch, p_at,
            concat_ws(':', coalesce(p_task, p_event, p_review), p_kind, extract(epoch from p_at)::bigint, ch))
    on conflict (user_id, idempotency_key) do update
      set status = 'pending', attempt_count = 0, next_attempt_at = excluded.next_attempt_at, last_error = null
      where public.reminder_jobs.status = 'cancelled';
  end loop;
end $$;

create or replace function private.sync_task_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
declare lead integer;
begin
  update public.reminder_jobs set status = 'cancelled' where task_id = new.id and status = 'pending';
  if new.status in ('todo','in_progress','waiting') and new.archived_at is null then
    select default_deadline_lead_minutes into lead from public.user_preferences where user_id = new.user_id;
    if new.due_at is not null then
      if coalesce(lead, 0) > 0 then perform private.queue_reminder(new.user_id, new.id, null, null, 'deadline_lead', new.due_at - make_interval(mins => lead)); end if;
      perform private.queue_reminder(new.user_id, new.id, null, null, 'deadline', new.due_at);
    end if;
    perform private.queue_reminder(new.user_id, new.id, null, null, 'scheduled', new.scheduled_at);
    perform private.queue_reminder(new.user_id, new.id, null, null, 'custom', new.remind_at);
  end if;
  return null;
end $$;
create trigger tasks_sync_reminders after insert or update of status, due_at, scheduled_at, remind_at, archived_at on public.tasks
  for each row execute function private.sync_task_reminders();

create or replace function private.sync_event_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
declare lead integer;
begin
  update public.reminder_jobs set status = 'cancelled' where event_id = new.id and status = 'pending';
  if new.status = 'upcoming' then
    select default_meeting_lead_minutes into lead from public.user_preferences where user_id = new.user_id;
    if coalesce(lead, 0) > 0 then perform private.queue_reminder(new.user_id, null, new.id, null, 'start_lead', new.start_at - make_interval(mins => lead)); end if;
    perform private.queue_reminder(new.user_id, null, new.id, null, 'start', new.start_at);
    perform private.queue_reminder(new.user_id, null, new.id, null, 'follow_up', new.follow_up_at);
  end if;
  return null;
end $$;
create trigger events_sync_reminders after insert or update of status, start_at, follow_up_at on public.events
  for each row execute function private.sync_event_reminders();

create or replace function private.sync_review_reminders() returns trigger
language plpgsql security definer set search_path = '' as $$
declare tz text;
begin
  update public.reminder_jobs set status = 'cancelled' where review_id = new.id and status = 'pending';
  if new.status in ('upcoming','in_progress') and new.review_date is not null then
    select timezone into tz from public.profiles where id = new.user_id;
    perform private.queue_reminder(new.user_id, null, null, new.id, 'review_date',
      ((new.review_date + time '08:00') at time zone coalesce(tz, 'Africa/Johannesburg')));
  end if;
  return null;
end $$;
create trigger reviews_sync_reminders after insert or update of status, review_date on public.reviews
  for each row execute function private.sync_review_reminders();

-- ---------------------------------------------------------------------------------------------
-- Worker RPCs (service role only)
-- ---------------------------------------------------------------------------------------------
create or replace function public.claim_reminder_jobs(p_limit integer default 25) returns setof public.reminder_jobs
language plpgsql security definer set search_path = '' as $$
begin
  return query
  update public.reminder_jobs j
     set status = 'processing', attempt_count = j.attempt_count + 1, last_attempt_at = now()
   where j.id in (
     select id from public.reminder_jobs
      where (status = 'pending' and next_attempt_at <= now())
         or (status = 'processing' and last_attempt_at < now() - interval '10 minutes')
      order by next_attempt_at
      limit greatest(p_limit, 1)
      for update skip locked)
  returning j.*;
end $$;

create or replace function public.finish_reminder_job(p_id uuid, p_ok boolean, p_provider_id text default null, p_error text default null, p_retry boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare j public.reminder_jobs;
begin
  select * into j from public.reminder_jobs where id = p_id for update;
  if not found or j.status = 'sent' then return; end if;
  if p_ok then
    update public.reminder_jobs set status = 'sent', sent_at = now(), provider_message_id = p_provider_id, last_error = null where id = p_id;
  elsif p_retry and j.attempt_count < 5 then
    update public.reminder_jobs set status = 'pending', next_attempt_at = now() + (interval '1 minute' * power(2, j.attempt_count)), last_error = left(p_error, 200) where id = p_id;
  else
    update public.reminder_jobs set status = 'failed', last_error = left(p_error, 200) where id = p_id;
  end if;
end $$;

revoke all on function public.claim_reminder_jobs(integer) from public, anon, authenticated;
revoke all on function public.finish_reminder_job(uuid, boolean, text, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_reminder_jobs(integer) to service_role;
grant execute on function public.finish_reminder_job(uuid, boolean, text, text, boolean) to service_role;

-- ---------------------------------------------------------------------------------------------
-- Business-logic RPCs (security invoker: RLS applies)
-- ---------------------------------------------------------------------------------------------
