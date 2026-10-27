create table public.reminder_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid,
  event_id uuid,
  review_id uuid,
  kind text not null check (kind in ('deadline_lead','deadline','scheduled','custom','start_lead','start','follow_up','review_date')),
  reminder_at timestamptz not null,
  channel text not null check (channel in ('in_app','email')),
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  sent_at timestamptz,
  idempotency_key text not null,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, idempotency_key),
  constraint reminder_one_target check (num_nonnulls(task_id, event_id, review_id) = 1),
  foreign key (user_id, task_id) references public.tasks(user_id, id) on delete cascade,
  foreign key (user_id, event_id) references public.events(user_id, id) on delete cascade,
  foreign key (user_id, review_id) references public.reviews(user_id, id) on delete cascade
);
create index reminder_jobs_due_idx on public.reminder_jobs (next_attempt_at) where status in ('pending','processing');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'reminder' check (type in ('reminder','system')),
  title text not null,
  body text,
  task_id uuid,
  event_id uuid,
  review_id uuid,
  reminder_job_id uuid unique,
  read_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_one_target check (num_nonnulls(task_id, event_id, review_id) <= 1),
  foreign key (user_id, task_id) references public.tasks(user_id, id) on delete cascade,
  foreign key (user_id, event_id) references public.events(user_id, id) on delete cascade,
  foreign key (user_id, review_id) references public.reviews(user_id, id) on delete cascade,
  foreign key (user_id, reminder_job_id) references public.reminder_jobs(user_id, id) on delete set null (reminder_job_id)
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------------------------
-- Indexes for common queries
-- ---------------------------------------------------------------------------------------------
create index tasks_user_status_idx on public.tasks (user_id, status) where archived_at is null;
create index tasks_user_due_idx on public.tasks (user_id, due_at) where due_at is not null;
create index tasks_user_sched_idx on public.tasks (user_id, scheduled_at) where scheduled_at is not null;
create index tasks_project_idx on public.tasks (user_id, project_id);
create index tasks_category_idx on public.tasks (user_id, category_id);
create index tasks_parent_idx on public.tasks (user_id, parent_task_id);
create index tasks_fts_idx on public.tasks using gin (fts);
create index projects_user_status_idx on public.projects (user_id, status);
create index projects_fts_idx on public.projects using gin (fts);
create index milestones_project_idx on public.project_milestones (user_id, project_id, position);
create index ideas_user_status_idx on public.ideas (user_id, status);
create index ideas_fts_idx on public.ideas using gin (fts);
create index notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index notes_fts_idx on public.notes using gin (fts);
create index events_user_start_idx on public.events (user_id, start_at);
create index events_fts_idx on public.events using gin (fts);
create index agenda_event_idx on public.event_agenda_items (user_id, event_id, position);
create index reviews_user_date_idx on public.reviews (user_id, review_date);
create index reviews_fts_idx on public.reviews using gin (fts);

-- ---------------------------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['projects','project_milestones','tasks','ideas','notes','events','event_agenda_items','reviews','weekly_reviews','reminder_jobs'] loop
    execute format('create trigger %1$s_updated before update on public.%1$s for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- completion timestamps + recurrence series bookkeeping
create or replace function public.tasks_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then new.completed_at := coalesce(new.completed_at, now()); end if;
  else
    new.completed_at := null;
  end if;
  if new.recurrence_rule is not null and new.recurrence_series_id is null then
    new.recurrence_series_id := new.id;
    new.occurrence_key := extract(epoch from coalesce(new.due_at, new.scheduled_at))::bigint::text;
  end if;
  return new;
end $$;
create trigger tasks_before before insert or update on public.tasks for each row execute function public.tasks_before_write();

create or replace function public.milestones_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' then
    if tg_op = 'INSERT' or old.status is distinct from 'done' then new.completed_at := coalesce(new.completed_at, now()); end if;
  else new.completed_at := null; end if;
  return new;
end $$;
create trigger milestones_before before insert or update on public.project_milestones for each row execute function public.milestones_before_write();

create or replace function public.reviews_before_write() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'completed' then
    if tg_op = 'INSERT' or old.status is distinct from 'completed' then new.completed_at := coalesce(new.completed_at, now()); end if;
  else new.completed_at := null; end if;
  return new;
end $$;
create trigger reviews_before before insert or update on public.reviews for each row execute function public.reviews_before_write();

-- ---------------------------------------------------------------------------------------------
-- Reminder scheduling: reconcile pending jobs whenever a dated record changes
-- ---------------------------------------------------------------------------------------------
