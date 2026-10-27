create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Owner allow-list: only this email can ever register (checked by the auth.users insert trigger).
-- Seed it once with:  insert into private.app_owner(email) values ('you@example.com');
-- ---------------------------------------------------------------------------------------------
create table if not exists private.app_owner (email text primary key check (email = lower(email)));

create or replace function public.enforce_single_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'This instance is private and already has an owner.';
  end if;
  if not exists (select 1 from private.app_owner where email = lower(new.email)) then
    raise exception 'Sign-ups are closed.';
  end if;
  return new;
end $$;

create or replace function public.user_tz() returns text
language sql stable set search_path = '' as $$
  select coalesce((select timezone from public.profiles where id = (select auth.uid())), 'Africa/Johannesburg')
$$;

-- ---------------------------------------------------------------------------------------------
-- Projects and milestones
-- ---------------------------------------------------------------------------------------------
revoke all on function public.user_tz() from public, anon;
grant execute on function public.user_tz() to authenticated;
