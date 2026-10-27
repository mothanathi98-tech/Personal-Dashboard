do $$
declare t text;
begin
  foreach t in array array[
    'projects','project_milestones','tasks','ideas','notes','events','event_agenda_items','reviews','weekly_reviews','tags',
    'task_tags','idea_tags','note_tags','event_tags','review_tags','idea_notes','task_notes','event_notes','task_events','review_tasks'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- notifications: owner reads, marks read/dismissed, deletes. Inserts come only from the service-role worker.
alter table public.notifications enable row level security;
create policy notifications_select on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at, dismissed_at) on public.notifications to authenticated;

-- reminder_jobs: owner may read delivery status only; rows are created by triggers and updated by the worker.
alter table public.reminder_jobs enable row level security;
create policy reminder_jobs_select on public.reminder_jobs for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.reminder_jobs from anon, authenticated;
grant select on public.reminder_jobs to authenticated;

revoke all on public.project_progress from anon;
grant select on public.project_progress to authenticated;
revoke all on function public.global_search(text, text[], uuid, text, text, uuid, text, timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.global_search(text, text[], uuid, text, text, uuid, text, timestamptz, timestamptz, integer) to authenticated;
revoke all on function public.complete_task(uuid), public.reopen_task(uuid), public.convert_idea_to_task(uuid), public.convert_idea_to_project(uuid) from public, anon;
grant execute on function public.complete_task(uuid), public.reopen_task(uuid), public.convert_idea_to_task(uuid), public.convert_idea_to_project(uuid) to authenticated;
