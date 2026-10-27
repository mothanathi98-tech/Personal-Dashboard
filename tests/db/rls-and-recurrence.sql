-- Run against a scratch/clean database (or in a transaction that is rolled back).
-- Checks: single-user guard, onboarding categories, cross-user FK rejection, RLS isolation,
-- idempotent recurring-task completion, undated tasks never overdue.
-- The block ends with a deliberate exception so nothing persists; read the RESULT line.
do $$
declare u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); res text := ''; t1 uuid; c2 uuid; n int;
begin
  insert into private.app_owner values ('t1@test.local'), ('t2@test.local');
  insert into auth.users (id, email, aud, role, instance_id) values (u1, 't1@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  begin
    insert into auth.users (id, email, aud, role, instance_id) values (u2, 't2@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
    res := res || 'FAIL second user allowed; ';
  exception when others then res := res || 'ok second user blocked; '; end;
  -- Test-only: relax the guard so a second identity exists (rolled back with the transaction).
  create or replace function public.enforce_single_user() returns trigger language plpgsql as 'begin return new; end';
  insert into auth.users (id, email, aud, role, instance_id) values (u2, 't2@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  select id into c2 from public.categories where user_id = u2 limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.categories; res := res || 'u1 categories=' || n || ' (expect 5); ';
  begin insert into public.tasks(user_id, title, category_id) values (u1, 'x', c2); res := res || 'FAIL cross-user category; ';
  exception when others then res := res || 'ok cross-user category rejected; '; end;
  begin insert into public.tasks(user_id, title) values (u2, 'y'); res := res || 'FAIL insert as other; ';
  exception when others then res := res || 'ok insert as other rejected; '; end;
  insert into public.tasks(user_id, title, due_at, recurrence_rule) values (u1, 'daily', now() + interval '1 day', 'daily') returning id into t1;
  insert into public.tasks(user_id, title) values (u1, 'undated');
  perform public.complete_task(t1); perform public.complete_task(t1);
  select count(*) into n from public.tasks where title = 'daily'; res := res || 'daily rows=' || n || ' (expect 2); ';
  select count(*) into n from public.tasks where due_at < now() and status not in ('done','cancelled') and archived_at is null;
  res := res || 'overdue=' || n || ' (expect 0); ';
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.tasks; res := res || 'u2 sees tasks=' || n || ' (expect 0); ';
  update public.tasks set title = 'hack' where id = t1; get diagnostics n = row_count; res := res || 'u2 update rows=' || n || ' (expect 0); ';
  reset role;
  raise exception 'RESULT: %', res;
end $$;
