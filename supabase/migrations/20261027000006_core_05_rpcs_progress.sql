create or replace function public.complete_task(p_task_id uuid) returns public.tasks
language plpgsql set search_path = '' as $$
declare
  t public.tasks; tz text := public.user_tz();
  anchor timestamptz; la timestamp; nl timestamp; nxt timestamptz; delta interval; i integer; nid uuid;
begin
  select * into t from public.tasks where id = p_task_id for update;
  if not found then raise exception 'Task not found'; end if;
  if t.status in ('done','cancelled') then return t; end if;   -- idempotent: a second call is a no-op
  update public.tasks set status = 'done' where id = t.id returning * into t;

  if t.recurrence_rule is not null then
    anchor := coalesce(t.due_at, t.scheduled_at);
    la := anchor at time zone tz;
    if t.recurrence_rule = 'daily' then nl := la + interval '1 day';
    elsif t.recurrence_rule = 'weekly' then nl := la + interval '1 week';
    elsif t.recurrence_rule = 'monthly' then nl := la + interval '1 month';
    else
      for i in 1..7 loop
        nl := la + make_interval(days => i);
        exit when extract(dow from nl)::smallint = any (t.recurrence_weekdays);
      end loop;
    end if;
    nxt := nl at time zone tz;
    delta := nxt - anchor;
    insert into public.tasks (user_id, category_id, project_id, parent_task_id, title, description, status, priority,
                              due_at, scheduled_at, remind_at, estimated_minutes, position, recurrence_rule, recurrence_weekdays,
                              recurrence_series_id, occurrence_key)
    values (t.user_id, t.category_id, t.project_id, t.parent_task_id, t.title, t.description, 'todo', t.priority,
            t.due_at + delta, t.scheduled_at + delta, t.remind_at + delta, t.estimated_minutes, t.position, t.recurrence_rule, t.recurrence_weekdays,
            t.recurrence_series_id, extract(epoch from nxt)::bigint::text)
    on conflict (user_id, recurrence_series_id, occurrence_key) where recurrence_series_id is not null do nothing
    returning id into nid;
    if nid is not null then
      insert into public.task_tags (user_id, task_id, tag_id) select user_id, nid, tag_id from public.task_tags where task_id = t.id;
    end if;
  end if;
  return t;
end $$;

create or replace function public.reopen_task(p_task_id uuid) returns public.tasks
language plpgsql set search_path = '' as $$
declare t public.tasks;
begin
  update public.tasks set status = 'todo' where id = p_task_id and status in ('done','cancelled') returning * into t;
  if not found then select * into t from public.tasks where id = p_task_id; end if;
  return t;
end $$;

create or replace function public.convert_idea_to_task(p_idea_id uuid) returns uuid
language plpgsql set search_path = '' as $$
declare i public.ideas; tid uuid;
begin
  select * into i from public.ideas where id = p_idea_id for update;
  if not found then raise exception 'Idea not found'; end if;
  if i.converted_task_id is not null then return i.converted_task_id; end if;   -- no duplicate conversion
  insert into public.tasks (user_id, category_id, project_id, title, description)
  values (i.user_id, i.category_id, i.project_id, i.title, i.content) returning id into tid;
  insert into public.task_tags (user_id, task_id, tag_id) select user_id, tid, tag_id from public.idea_tags where idea_id = i.id;
  update public.ideas set converted_task_id = tid,
    status = case when status in ('raw_idea','exploring','validating','ready_to_build') then 'in_progress' else status end
   where id = i.id;
  return tid;
end $$;

create or replace function public.convert_idea_to_project(p_idea_id uuid) returns uuid
language plpgsql set search_path = '' as $$
declare i public.ideas; pid uuid;
begin
  select * into i from public.ideas where id = p_idea_id for update;
  if not found then raise exception 'Idea not found'; end if;
  if i.converted_project_id is not null then return i.converted_project_id; end if;
  insert into public.projects (user_id, category_id, name, description, status)
  values (i.user_id, i.category_id, i.title, i.content, 'planning') returning id into pid;
  update public.ideas set converted_project_id = pid, project_id = coalesce(project_id, pid),
    status = case when status in ('raw_idea','exploring','validating','ready_to_build') then 'in_progress' else status end
   where id = i.id;
  return pid;
end $$;

-- Project progress. If a project has milestones: weighted share of done milestones (weight default 1).
-- Otherwise: done tasks / non-cancelled tasks linked to the project. No tasks and no milestones => 0.
create view public.project_progress with (security_invoker = true) as
select p.id as project_id, p.user_id,
  case when coalesce(m.total_weight, 0) > 0 then round(100 * m.done_weight / m.total_weight)
       when coalesce(t.total, 0) > 0 then round(100.0 * t.done / t.total) else 0 end::integer as pct,
  case when coalesce(m.total_weight, 0) > 0 then 'milestones' else 'tasks' end as basis,
  coalesce(t.total, 0) as task_total, coalesce(t.done, 0) as task_done
from public.projects p
left join lateral (select sum(weight) as total_weight, coalesce(sum(weight) filter (where status = 'done'), 0) as done_weight
                     from public.project_milestones where project_id = p.id) m on true
left join lateral (select count(*) filter (where status <> 'cancelled') as total, count(*) filter (where status = 'done') as done
                     from public.tasks where project_id = p.id) t on true;
