import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm from "@/components/ActionForm";
import { PageHeader } from "@/components/ui";
import { getCtx } from "@/lib/permissions/owner";
import { loadTags } from "@/lib/tags";
import { z } from "zod";
import { deleteTask, saveTask } from "@/features/tasks/actions";
import TaskFields from "@/features/tasks/TaskFields";
import TaskRow from "@/features/tasks/TaskRow";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, categories, tz } = await getCtx();
  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
  if (!task) notFound();
  const [{ data: projects }, { data: parents }, { data: subs }, tagMap, { data: links }] = await Promise.all([
    supabase.from("projects").select("id,name").is("archived_at", null).order("name"),
    supabase.from("tasks").select("id,title").is("archived_at", null).order("title").limit(200),
    supabase.from("tasks").select("id,title,status,priority,due_at,scheduled_at,archived_at,recurrence_rule,category_id,parent_task_id").eq("parent_task_id", id).order("created_at"),
    loadTags(supabase, "task", [id]),
    supabase.from("task_events").select("relation, events(id,title,start_at)").eq("task_id", id),
  ]);
  return (
    <>
      <PageHeader title={task.title} subtitle={task.completed_at ? "Completed" : undefined} actions={<Link href="/tasks" className="btn secondary sm">← Tasks</Link>} />
      <div className="card">
        <ActionForm action={saveTask} submitLabel="Save changes">
          <TaskFields task={task} categories={categories} projects={projects ?? []} parents={parents ?? []} tz={tz} tags={tagMap.get(id)} />
        </ActionForm>
      </div>
      <div className="card">
        <h2>Subtasks</h2>
        {(subs ?? []).length === 0 ? <p className="muted">No subtasks. Create a task and set this one as its parent.</p> : <ul className="list">{subs!.map((s) => <TaskRow key={s.id} t={s} tz={tz} />)}</ul>}
      </div>
      {(links ?? []).length > 0 && (
        <div className="card">
          <h2>Linked meetings</h2>
          <ul className="list">{links!.map((l, i) => { const e = (l as unknown as { events: { id: string; title: string } | null; relation: string }); return e.events ? <li key={i}><Link href={`/meetings/${e.events.id}`}>{e.events.title}</Link><span className="badge">{e.relation === "follow_up" ? "Follow-up" : "Preparation"}</span></li> : null; })}</ul>
        </div>
      )}
      <div className="card">
        <ActionForm action={deleteTask} confirm="Delete this task permanently? Subtasks are kept." submitLabel="Delete task" submitClass="btn danger">
          <input type="hidden" name="id" value={id} /><input type="hidden" name="redirect" value="1" />
        </ActionForm>
      </div>
    </>
  );
}
