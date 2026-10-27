create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid,
  project_id uuid,
  title text not null check (length(trim(title)) between 1 and 300),
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  meeting_url text check (meeting_url is null or meeting_url ~* '^https?://'),
  status text not null default 'upcoming' check (status in ('upcoming','completed','cancelled')),
  minutes text,
  decisions text,
  follow_up_at timestamptz,
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'') || ' ' || coalesce(minutes,'') || ' ' || coalesce(decisions,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint events_range check (end_at is null or end_at >= start_at),
  constraint events_category_fk foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null (category_id),
  constraint events_project_fk foreign key (user_id, project_id) references public.projects(user_id, id) on delete set null (project_id)
);

create table public.event_agenda_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 300),
  description text,
  position integer not null default 0,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint agenda_event_fk foreign key (user_id, event_id) references public.events(user_id, id) on delete cascade
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid,
  project_id uuid,
  title text not null check (length(trim(title)) between 1 and 300),
  description text,
  review_date date,
  status text not null default 'upcoming' check (status in ('upcoming','in_progress','completed','cancelled')),
  notes text,
  completed_at timestamptz,
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'') || ' ' || coalesce(notes,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint reviews_category_fk foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null (category_id),
  constraint reviews_project_fk foreign key (user_id, project_id) references public.projects(user_id, id) on delete set null (project_id)
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  reflection text,
  lessons_learned text,
  next_week_priorities text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, week_start),
  constraint weekly_reviews_span check (week_end = week_start + 6)
);

-- ---------------------------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------------------------
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (user_id, id)
);
create unique index tags_user_name_uq on public.tags (user_id, lower(name));

-- tag join tables and explicit record-link tables (composite FKs on both sides)
do $$
declare r record;
begin
  for r in select * from (values ('task','tasks'),('idea','ideas'),('note','notes'),('event','events'),('review','reviews')) v(s,t) loop
    execute format($f$
      create table public.%1$s_tags (
        user_id uuid not null references public.profiles(id) on delete cascade,
        %1$s_id uuid not null,
        tag_id uuid not null,
        created_at timestamptz not null default now(),
        primary key (%1$s_id, tag_id),
        foreign key (user_id, %1$s_id) references public.%2$s(user_id, id) on delete cascade,
        foreign key (user_id, tag_id) references public.tags(user_id, id) on delete cascade
      )$f$, r.s, r.t);
    execute format('create index %1$s_tags_tag_idx on public.%1$s_tags (user_id, tag_id)', r.s);
  end loop;

  for r in select * from (values
      ('idea_notes','idea','ideas','note','notes'),
      ('task_notes','task','tasks','note','notes'),
      ('event_notes','event','events','note','notes'),
      ('task_events','task','tasks','event','events'),
      ('review_tasks','review','reviews','task','tasks')) v(tbl,a,at,b,bt) loop
    execute format($f$
      create table public.%1$s (
        user_id uuid not null references public.profiles(id) on delete cascade,
        %2$s_id uuid not null,
        %4$s_id uuid not null,
        created_at timestamptz not null default now(),
        primary key (%2$s_id, %4$s_id),
        foreign key (user_id, %2$s_id) references public.%3$s(user_id, id) on delete cascade,
        foreign key (user_id, %4$s_id) references public.%5$s(user_id, id) on delete cascade
      )$f$, r.tbl, r.a, r.at, r.b, r.bt);
    execute format('create index %1$s_b_idx on public.%1$s (user_id, %2$s_id)', r.tbl, r.b);
  end loop;
end $$;

-- task_events distinguishes preparation from follow-up work
alter table public.task_events add column relation text not null default 'preparation' check (relation in ('preparation','follow_up'));

-- ---------------------------------------------------------------------------------------------
-- Reminder jobs and notifications
-- ---------------------------------------------------------------------------------------------
