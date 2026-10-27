create or replace function public.global_search(
  q text, p_kinds text[] default null, p_category uuid default null, p_status text default null,
  p_priority text default null, p_project uuid default null, p_tag text default null,
  p_from timestamptz default null, p_to timestamptz default null, p_limit integer default 50)
returns table (kind text, id uuid, title text, snippet text, category_id uuid, project_id uuid, status text, priority text, at timestamptz, rank real)
language sql stable set search_path = '' as $$
  with qq as (
    select websearch_to_tsquery('english', q) as tsq,
           '%' || replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat
  ), r as (
    select 'task'::text kind, t.id, t.title, ts_headline('english', coalesce(t.description,''), qq.tsq, 'MaxFragments=1,MaxWords=18,MinWords=6') snippet,
           t.category_id, t.project_id, t.status, t.priority, coalesce(t.due_at, t.scheduled_at, t.updated_at) at, ts_rank(t.fts, qq.tsq) rank
      from public.tasks t, qq
     where (t.fts @@ qq.tsq or t.title ilike qq.pat)
       and (p_tag is null or exists (select 1 from public.task_tags x join public.tags g on g.id = x.tag_id where x.task_id = t.id and lower(g.name) = lower(p_tag)))
    union all
    select 'project', p.id, p.name, ts_headline('english', coalesce(p.description,''), qq.tsq, 'MaxFragments=1,MaxWords=18,MinWords=6'),
           p.category_id, p.id, p.status, null, p.updated_at, ts_rank(p.fts, qq.tsq)
      from public.projects p, qq
     where (p.fts @@ qq.tsq or p.name ilike qq.pat) and p_tag is null
    union all
    select 'idea', i.id, i.title, ts_headline('english', coalesce(i.content,''), qq.tsq, 'MaxFragments=1,MaxWords=18,MinWords=6'),
           i.category_id, i.project_id, i.status, null, i.updated_at, ts_rank(i.fts, qq.tsq)
      from public.ideas i, qq
     where (i.fts @@ qq.tsq or i.title ilike qq.pat)
       and (p_tag is null or exists (select 1 from public.idea_tags x join public.tags g on g.id = x.tag_id where x.idea_id = i.id and lower(g.name) = lower(p_tag)))
    union all
    select 'note', n.id, n.title, ts_headline('english', n.content, qq.tsq, 'MaxFragments=1,MaxWords=18,MinWords=6'),
           n.category_id, n.project_id, case when n.archived_at is null then 'active' else 'archived' end, null, n.updated_at, ts_rank(n.fts, qq.tsq)
      from public.notes n, qq
     where (n.fts @@ qq.tsq or n.title ilike qq.pat)
       and (p_tag is null or exists (select 1 from public.note_tags x join public.tags g on g.id = x.tag_id where x.note_id = n.id and lower(g.name) = lower(p_tag)))
    union all
    select 'meeting', e.id, e.title, ts_headline('english', coalesce(e.description,'') || ' ' || coalesce(e.minutes,''), qq.tsq, 'MaxFragments=1,MaxWords=18,MinWords=6'),
           e.category_id, e.project_id, e.status, null, e.start_at, ts_rank(e.fts, qq.tsq)
      from public.events e, qq
     where (e.fts @@ qq.tsq or e.title ilike qq.pat)
       and (p_tag is null or exists (select 1 from public.event_tags x join public.tags g on g.id = x.tag_id where x.event_id = e.id and lower(g.name) = lower(p_tag)))
    union all
    select 'review', v.id, v.title, ts_headline('english', coalesce(v.description,'') || ' ' || coalesce(v.notes,''), qq.tsq, 'MaxFragments=1,MaxWords=18,MinWords=6'),
           v.category_id, v.project_id, v.status, null, coalesce(v.review_date::timestamptz, v.updated_at), ts_rank(v.fts, qq.tsq)
      from public.reviews v, qq
     where (v.fts @@ qq.tsq or v.title ilike qq.pat)
       and (p_tag is null or exists (select 1 from public.review_tags x join public.tags g on g.id = x.tag_id where x.review_id = v.id and lower(g.name) = lower(p_tag)))
  )
  select r.kind, r.id, r.title, r.snippet, r.category_id, r.project_id, r.status, r.priority, r.at, r.rank
    from r
   where length(trim(q)) > 0
     and (p_kinds is null or r.kind = any (p_kinds))
     and (p_category is null or r.category_id = p_category)
     and (p_status is null or r.status = p_status)
     and (p_priority is null or r.priority = p_priority)
     and (p_project is null or r.project_id = p_project)
     and (p_from is null or r.at >= p_from)
     and (p_to is null or r.at < p_to)
   order by r.rank desc, r.at desc nulls last
   limit least(greatest(p_limit, 1), 200)
$$;
