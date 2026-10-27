-- Foundation: profiles, user_preferences, categories, single-user guard, onboarding.

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Africa/Johannesburg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  default_task_priority text not null default 'medium' check (default_task_priority in ('low','medium','high','urgent')),
  date_format text not null default 'dd MMM yyyy',
  time_format text not null default '24h' check (time_format in ('12h','24h')),
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  email_reminders_enabled boolean not null default true,
  default_meeting_lead_minutes integer not null default 15 check (default_meeting_lead_minutes >= 0),
  default_deadline_lead_minutes integer not null default 1440 check (default_deadline_lead_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 60),
  slug text not null,
  color text not null default '#22804A' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug),
  unique (user_id, id) -- target for composite ownership FKs in later migrations
);
create index categories_user_idx on public.categories(user_id);

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger prefs_updated before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger categories_updated before update on public.categories for each row execute function public.set_updated_at();

-- Single-user guard: refuse a second auth user at database level.
create or replace function public.enforce_single_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'This instance is private and already has an owner.';
  end if;
  return new;
end $$;
create trigger auth_single_user before insert on auth.users for each row execute function public.enforce_single_user();

-- Onboarding: profile, preferences and default categories for the new owner.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name) values (new.id, split_part(new.email, '@', 1));
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.categories (user_id, name, slug, color) values
    (new.id, 'School', 'school', '#F5F5F5'),
    (new.id, 'Pulsea', 'pulsea', '#22804A'),
    (new.id, 'Side Hustle', 'side-hustle', '#A5B1A8'),
    (new.id, 'Personal', 'personal', '#174D31'),
    (new.id, 'Other', 'other', '#3A433D');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.categories enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy prefs_select on public.user_preferences for select to authenticated using (user_id = (select auth.uid()));
create policy prefs_update on public.user_preferences for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy categories_select on public.categories for select to authenticated using (user_id = (select auth.uid()));
create policy categories_insert on public.categories for insert to authenticated with check (user_id = (select auth.uid()));
create policy categories_update on public.categories for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy categories_delete on public.categories for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.profiles, public.user_preferences, public.categories from anon;
