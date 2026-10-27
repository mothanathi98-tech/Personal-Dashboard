import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Dot, Empty, PageHeader, Tabs, label } from "@/components/ui";
import { getCtx } from "@/lib/permissions/owner";
import { loadTags } from "@/lib/tags";
import { bulkTasks, saveTask, setTaskStatus } from "@/features/tasks/actions";
import TaskFields from "@/features/tasks/TaskFields";
import TaskRow from "@/features/tasks/TaskRow";

type SP = { view?: string; f?: string; q?: string; category?: string; project?: string; priority?: string; sort?: string };
const FILTERS = [["active", "Active"], ["overdue", "Overdue"], ["upcoming", "Upcoming"], ["undated", "Undated"], ["done", "Completed"], ["archived", "Archived"], ["all", "All"]] as const;
const COLS = ["todo", "in_progress", "waiting", "done"] as const;
const PRIO_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, categories, tz } = await getCtx();
  const view = sp.view === "kanban" ? "kanban" : "list";
  const f = FILTERS.some(([k]) => k === sp.f) ? sp.f! : "active";
  const sort = ["due", "priority", "created", "manual"].includes(sp.sort ?? "") ? sp.sort! : "due";
  const nowIso = new Date().toISOString();

  let q = supabase.from("tasks").select("id,title,status,priority,due_at,scheduled_at,archived_at,recurrence_rule,category_id,parent_task_id,position,created_at,project_id").limit(300);
  if (f === "archived") q = q.not("archived_at", "is", null); else q = q.is("archived_at", null);
  if (view === "kanban" && f === "active") q = q.in("status", ["todo", "in_progress", "waiting"]);
  else if (f === "active") q = q.in("status", ["todo", "in_progress", "waiting"]);
  if (f === "overdue") q = q.lt("due_at", nowIso).in("status", ["todo", "in_progress", "waiting"]);
  if (f === "upcoming") q = q.gte("due_at", nowIso).in("status", ["todo", "in_progress", "waiting"]);
  if (f === "undated") q = q.is("due_at", null).in("status", ["todo", "in_progress", "waiting"]);
  if (f === "done") q = q.eq("status", "done");
  if (sp.category) q = q.eq("category_id", sp.category);
  if (sp.project) q = q.eq("project_id", sp.project);
  if (sp.priority) q = q.eq("priority", sp.priority);
  if (sp.q?.trim()) q = q.ilike("title", `%${sp.q.trim().replace(/[%_\\]/g, "\\$&")}%`);
  q = sort === "manual" ? q.order("position").order("created_at") : sort === "created" ? q.order("created_at", { ascending: false }) : q.order("due_at", { ascending: true, nullsFirst: false });
  const [{ data: rows, error }, { data: projects }, { data: allTop }] = await Promise.all([
    q,
    supabase.from("projects").select("id,name").is("archived_at", null).order("name"),
    supabase.from("tasks").select("id,title").is("archived_at", null).is("parent_task_id", null).order("title").limit(200),
  ]);
  let tasks = rows ?? [];
  if (sort === "priority") tasks = [...tasks].sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority]);
  const tagMap = await loadTags(supabase, "task", tasks.map((t) => t.id));
  const colorOf = (id: string | null) => categories.find((c) => c.id === id)?.color;
  const titleOf = new Map((allTop ?? []).map((t) => [t.id, t.title]));
  const qs = (over: Partial<SP>) => { const p = new URLSearchParams(); const m = { ...sp, ...over }; for (const [k, v] of Object.entries(m)) if (v) p.set(k, v); return `/tasks?${p}`; };

  return (
    <>
      <PageHeader title="Tasks" subtitle={`${tasks.length} shown`} actions={
        <>
          <Link className={`btn secondary sm`} href={qs({ view: "list" })} aria-current={view === "list" ? "page" : undefined}>List</Link>
          <Link className={`btn secondary sm`} href={qs({ view: "kanban" })} aria-current={view === "kanban" ? "page" : undefined}>Kanban</Link>
        </>
      } />
      <details className="card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ New task</summary>
        <div style={{ marginTop: 12 }}>
          <ActionForm action={saveTask} resetOnSuccess submitLabel="Create task">
            <TaskFields categories={categories} projects={projects ?? []} parents={allTop ?? []} tz={tz} defaults={{ project_id: sp.project, category_id: sp.category }} />
          </ActionForm>
        </div>
      </details>
      <Tabs current={f} items={FILTERS.map(([k, l]) => ({ key: k, label: l, href: qs({ f: k }) }))} />
      <form method="get" className="row" style={{ marginBottom: 14 }}>
        <input type="hidden" name="view" value={view} /><input type="hidden" name="f" value={f} />
        <input name="q" placeholder="Search titles" defaultValue={sp.q} style={{ maxWidth: 220 }} aria-label="Search tasks" />
        <select name="category" defaultValue={sp.category ?? ""} aria-label="Category" style={{ maxWidth: 160 }}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="project" defaultValue={sp.project ?? ""} aria-label="Project" style={{ maxWidth: 160 }}><option value="">All projects</option>{(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="priority" defaultValue={sp.priority ?? ""} aria-label="Priority" style={{ maxWidth: 140 }}><option value="">Any priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
        <select name="sort" defaultValue={sort} aria-label="Sort" style={{ maxWidth: 150 }}><option value="due">Sort: due date</option><option value="priority">Sort: priority</option><option value="created">Sort: newest</option><option value="manual">Sort: manual</option></select>
        <button className="btn secondary sm" type="submit">Apply</button>
        <Link className="btn secondary sm" href="/tasks">Reset</Link>
      </form>
      {error && <p className="err" role="alert">⚠ Could not load tasks.</p>}
      {!error && tasks.length === 0 && <Empty title="No tasks here" hint={f === "active" ? "Add your first task above, or use quick-add (+)." : "Nothing matches this filter."} />}
      {view === "list" && tasks.length > 0 && (
        <div className="card">
          <ActionForm id="bulk-form" action={bulkTasks} className="row" submitLabel="Apply to selected">
            <select name="op" aria-label="Bulk action" style={{ maxWidth: 160 }}><option value="complete">Complete selected</option><option value="archive">Archive selected</option></select>
          </ActionForm>
          <ul className="list">
            {tasks.map((t) => <TaskRow key={t.id} t={t} tz={tz} color={colorOf(t.category_id)} tags={tagMap.get(t.id)} parentTitle={t.parent_task_id ? titleOf.get(t.parent_task_id) : undefined} selectable reorder={sort === "manual"} />)}
          </ul>
        </div>
      )}
      {view === "kanban" && tasks.length > 0 && (
        <div className="kanban">
          {COLS.map((col) => {
            const items = tasks.filter((t) => t.status === col).slice(0, 40);
            return (
              <section key={col} className="kcol" aria-label={label(col)}>
                <h3>{label(col)} <span className="muted small">({items.length})</span></h3>
                {items.map((t) => (
                  <article key={t.id} className="kcard">
                    <Dot color={colorOf(t.category_id)} /><Link href={`/tasks/${t.id}`} className="plain">{t.title}</Link>
                    <div className="row" style={{ marginTop: 6, gap: 4 }}>
                      {COLS.filter((c) => c !== col).map((c) => (
                        <ActionForm key={c} action={setTaskStatus} inline><input type="hidden" name="id" value={t.id} /><input type="hidden" name="status" value={c} /><button className="btn secondary sm" title={`Move to ${label(c)}`}>→ {label(c)}</button></ActionForm>
                      ))}
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
