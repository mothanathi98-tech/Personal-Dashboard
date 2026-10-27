create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid,
  name text not null check (length(trim(name)) between 1 and 200),
  description text,
  status text not null default 'planning' check (status in ('planning','active','on_hold','completed','archived')),
  start_date date,
  target_date date,
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(name,'')), 'A') || setweight(to_tsvector('english', coalesce(description,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, id),
  constraint projects_dates check (target_date is null or start_date is null or target_date >= start_date),
  constraint projects_category_fk foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null (category_id)
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 200),
  description text,
  status text not null default 'open' check (status in ('open','done')),
  due_date date,
  weight numeric not null default 1 check (weight > 0),
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint milestones_project_fk foreign key (user_id, project_id) references public.projects(user_id, id) on delete cascade
);

-- ---------------------------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid,
  project_id uuid,
  parent_task_id uuid,
  title text not null check (length(trim(title)) between 1 and 300),
  description text,
  status text not null default 'todo' check (status in ('todo','in_progress','waiting','done','cancelled')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  due_at timestamptz,            -- deadline (optional)
  scheduled_at timestamptz,      -- when I plan to work on it (optional)
  remind_at timestamptz,         -- explicit reminder time (optional, independent of due/scheduled)
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  position double precision not null default 0,
  recurrence_rule text check (recurrence_rule in ('daily','weekly','monthly','weekdays')),
  recurrence_weekdays smallint[] check (recurrence_weekdays is null or recurrence_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  recurrence_series_id uuid,
  occurrence_key text,
  completed_at timestamptz,
  archived_at timestamptz,
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(description,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint tasks_not_own_parent check (parent_task_id is distinct from id),
  constraint tasks_recurrence_anchor check (recurrence_rule is null or coalesce(due_at, scheduled_at) is not null),
  constraint tasks_weekdays_set check (recurrence_rule is distinct from 'weekdays' or coalesce(cardinality(recurrence_weekdays), 0) > 0),
  constraint tasks_category_fk foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null (category_id),
  constraint tasks_project_fk foreign key (user_id, project_id) references public.projects(user_id, id) on delete set null (project_id),
  constraint tasks_parent_fk foreign key (user_id, parent_task_id) references public.tasks(user_id, id) on delete set null (parent_task_id)
);
-- Database-enforced recurrence idempotency: one row per (series, occurrence).
create unique index tasks_series_occurrence_uq on public.tasks (user_id, recurrence_series_id, occurrence_key) where recurrence_series_id is not null;

-- ---------------------------------------------------------------------------------------------
-- Ideas and notes
-- ---------------------------------------------------------------------------------------------
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid,
  project_id uuid,
  title text not null check (length(trim(title)) between 1 and 300),
  content text,
  status text not null default 'raw_idea' check (status in ('raw_idea','exploring','validating','ready_to_build','in_progress','implemented','archived')),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  is_pinned boolean not null default false,
  converted_task_id uuid,
  converted_project_id uuid,
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(content,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, id),
  constraint ideas_category_fk foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null (category_id),
  constraint ideas_project_fk foreign key (user_id, project_id) references public.projects(user_id, id) on delete set null (project_id),
  constraint ideas_task_fk foreign key (user_id, converted_task_id) references public.tasks(user_id, id) on delete set null (converted_task_id),
  constraint ideas_converted_project_fk foreign key (user_id, converted_project_id) references public.projects(user_id, id) on delete set null (converted_project_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid,
  project_id uuid,
  title text not null check (length(trim(title)) between 1 and 300),
  content text not null default '',
  is_pinned boolean not null default false,
  fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(content,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (user_id, id),
  constraint notes_category_fk foreign key (user_id, category_id) references public.categories(user_id, id) on delete set null (category_id),
  constraint notes_project_fk foreign key (user_id, project_id) references public.projects(user_id, id) on delete set null (project_id)
);

-- ---------------------------------------------------------------------------------------------
-- Events (calendar + meetings), agenda items, reviews, weekly reviews
-- ---------------------------------------------------------------------------------------------
