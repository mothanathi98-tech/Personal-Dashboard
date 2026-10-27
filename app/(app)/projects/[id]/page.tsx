import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm from "@/components/ActionForm";
import { Dot, Empty, Field, PageHeader, Progress } from "@/components/ui";
import { formatDateOnly, formatDateTime } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { deleteMilestone, deleteProject, saveMilestone, saveProject, toggleMilestone } from "@/features/projects/actions";
import ProjectFields from "@/features/projects/ProjectFields";
import TaskRow from "@/features/tasks/TaskRow";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, categories, tz } = await getCtx();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) notFound();
  const [ms, tasks, notes, ideas, events, prog] = await Promise.all([
    supabase.from("project_milestones").select("*").eq("project_id", id).order("position"),
    supabase.from("tasks").select("id,title,status,priority,due_at,scheduled_at,archived_at,recurrence_rule,category_id,parent_task_id").eq("project_id", id).is("archived_at", null).order("created_at", { ascending: false }).limit(100),
    supabase.from("notes").select("id,title,updated_at").eq("project_id", id).is("archived_at", null).order("updated_at", { ascending: false }).limit(20),
    supabase.from("ideas").select("id,title,status").eq("project_id", id).is("archived_at", null).limit(20),
    supabase.from("events").select("id,title,start_at,status").eq("project_id", id).order("start_at", { ascending: false }).limit(20),
    supabase.from("project_progress").select("pct,basis,task_total,task_done").eq("project_id", id).maybeSingle(),
  ]);
  const colorOf = (cid: string | null) => categories.find((c) => c.id === cid)?.color;
  return (
    <>
      <PageHeader title={project.name} subtitle={project.target_date ? `Target ${formatDateOnly(project.target_date)}` : undefined} actions={<><Link className="btn secondary sm" href="/projects">← Projects</Link><Link className="btn sm" href={`/tasks?project=${id}`}>Tasks in this project</Link></>} />
      <div className="card">
        <Progress pct={prog.data?.pct ?? 0} />
        <p className="small muted">{prog.data?.pct ?? 0}% · {prog.data?.basis === "milestones" ? "weighted milestones" : `${prog.data?.task_done ?? 0} of ${prog.data?.task_total ?? 0} tasks done`}</p>
      </div>
      <div className="card"><h2>Details</h2><ActionForm action={saveProject} submitLabel="Save project"><ProjectFields project={project} categories={categories} /></ActionForm></div>
      <div className="card">
        <h2>Milestones</h2>
        {(ms.data ?? []).length === 0 ? <p className="muted">No milestones. Without milestones, progress follows completed tasks.</p> : (
          <ul className="list">
            {ms.data!.map((m) => (
              <li key={m.id}>
                <div className="row">
                  <ActionForm action={toggleMilestone} inline><input type="hidden" name="id" value={m.id} /><input type="hidden" name="done" value={m.status === "done" ? "0" : "1"} /><button className={m.status === "done" ? "btn secondary sm" : "btn sm"} aria-label={m.status === "done" ? "Reopen milestone" : "Complete milestone"}>{m.status === "done" ? "↺" : "✓"}</button></ActionForm>
                  <span style={m.status === "done" ? { textDecoration: "line-through", opacity: 0.7 } : undefined}>{m.title}</span>
                  <span className="badge">weight {Number(m.weight)}</span>{m.due_date && <span className="badge">due {formatDateOnly(m.due_date)}</span>}
                </div>
                <ActionForm action={deleteMilestone} inline confirm="Delete this milestone?"><input type="hidden" name="id" value={m.id} /><button className="btn secondary sm">Delete</button></ActionForm>
              </li>
            ))}
          </ul>
        )}
        <ActionForm action={saveMilestone} className="fields" resetOnSuccess submitLabel="Add milestone">
          <input type="hidden" name="project_id" value={id} />
          <Field label="Title"><input name="title" required /></Field>
          <Field label="Due date"><input name="due_date" type="date" /></Field>
          <Field label="Weight"><input name="weight" type="number" min="0.1" step="0.1" defaultValue={1} /></Field>
        </ActionForm>
      </div>
      <div className="card"><h2>Tasks</h2>{(tasks.data ?? []).length === 0 ? <Empty title="No tasks yet" action={<Link className="btn sm" href={`/tasks?project=${id}`}>Add a task</Link>} /> : <ul className="list">{tasks.data!.map((t) => <TaskRow key={t.id} t={t} tz={tz} color={colorOf(t.category_id)} />)}</ul>}</div>
      <div className="grid cols-3">
        <div className="card"><h3>Notes</h3>{(notes.data ?? []).length === 0 ? <p className="muted small">None linked.</p> : <ul className="list">{notes.data!.map((n) => <li key={n.id}><Link className="plain" href={`/notes/${n.id}`}>{n.title}</Link></li>)}</ul>}</div>
        <div className="card"><h3>Ideas</h3>{(ideas.data ?? []).length === 0 ? <p className="muted small">None linked.</p> : <ul className="list">{ideas.data!.map((n) => <li key={n.id}><Link className="plain" href={`/brainstorm/${n.id}`}>{n.title}</Link></li>)}</ul>}</div>
        <div className="card"><h3>Meetings</h3>{(events.data ?? []).length === 0 ? <p className="muted small">None linked.</p> : <ul className="list">{events.data!.map((n) => <li key={n.id}><span><Dot kind="meeting" /><Link className="plain" href={`/meetings/${n.id}`}>{n.title}</Link></span><span className="small muted">{formatDateTime(n.start_at, tz)}</span></li>)}</ul>}</div>
      </div>
      <div className="card"><ActionForm action={deleteProject} confirm="Delete this project and its milestones? Tasks, notes and ideas are kept (unlinked)." submitLabel="Delete project" submitClass="btn danger"><input type="hidden" name="id" value={id} /></ActionForm></div>
    </>
  );
}
