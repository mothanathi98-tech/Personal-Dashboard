import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm from "@/components/ActionForm";
import { Dot, Field, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { addNoteLink, removeNoteLink } from "@/features/notes/actions";
import { addAgendaItem, addEventTask, deleteAgendaItem, deleteEvent, moveAgendaItem, saveEvent, setEventStatus, toggleAgendaItem } from "@/features/meetings/actions";
import EventFields from "@/features/meetings/EventFields";
import TaskRow from "@/features/tasks/TaskRow";

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, categories, tz } = await getCtx();
  const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!ev) notFound();
  const [{ data: projects }, { data: agenda }, { data: links }, { data: nl }, { data: notes }] = await Promise.all([
    supabase.from("projects").select("id,name").is("archived_at", null).order("name"),
    supabase.from("event_agenda_items").select("*").eq("event_id", id).order("position").order("created_at"),
    supabase.from("task_events").select("relation, tasks(id,title,status,priority,due_at,scheduled_at,archived_at,recurrence_rule,category_id,parent_task_id)").eq("event_id", id),
    supabase.from("event_notes").select("notes(id,title)").eq("event_id", id),
    supabase.from("notes").select("id,title").is("archived_at", null).order("updated_at", { ascending: false }).limit(100),
  ]);
  type TL = { relation: string; tasks: Parameters<typeof TaskRow>[0]["t"] | null };
  const tl = (links ?? []) as unknown as TL[];
  const prep = tl.filter((l) => l.relation === "preparation" && l.tasks), fol = tl.filter((l) => l.relation === "follow_up" && l.tasks);
  const linkedNotes = (nl ?? []).map((r) => (r as unknown as { notes: { id: string; title: string } | null }).notes).filter((n): n is { id: string; title: string } => !!n);
  const have = new Set(linkedNotes.map((n) => n.id)); const options = (notes ?? []).filter((n) => !have.has(n.id));
  return (
    <>
      <PageHeader title={ev.title} subtitle={`${formatDateTime(ev.start_at, tz)}${ev.end_at ? ` – ${formatDateTime(ev.end_at, tz)}` : ""}`} actions={<><Link href="/meetings" className="btn secondary sm">← Meetings</Link>{ev.meeting_url && <a className="btn sm" href={ev.meeting_url} target="_blank" rel="noopener noreferrer">Join</a>}</>} />
      <div className="card">
        <div className="row">
          {ev.status === "upcoming" && <><ActionForm action={setEventStatus} inline><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="completed" /><button className="btn sm">Mark completed</button></ActionForm><ActionForm action={setEventStatus} inline confirm="Cancel this meeting? Pending reminders are removed."><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="cancelled" /><button className="btn danger sm">Cancel meeting</button></ActionForm></>}
          {ev.status !== "upcoming" && <ActionForm action={setEventStatus} inline><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value="upcoming" /><button className="btn secondary sm">Reopen as upcoming</button></ActionForm>}
        </div>
      </div>
      <div className="card"><h2><Dot kind="meeting" />Details, minutes and decisions</h2><ActionForm action={saveEvent} submitLabel="Save meeting"><EventFields ev={ev} categories={categories} projects={projects ?? []} tz={tz} full /></ActionForm></div>
      <div className="card">
        <h2>Agenda</h2>
        {(agenda ?? []).length === 0 ? <p className="muted">No agenda items yet.</p> : <ul className="list">{agenda!.map((a) => (
          <li key={a.id}>
            <div className="row">
              <ActionForm action={toggleAgendaItem} inline><input type="hidden" name="id" value={a.id} /><input type="hidden" name="done" value={a.is_completed ? "0" : "1"} /><button className={a.is_completed ? "btn secondary sm" : "btn sm"} aria-label={a.is_completed ? "Mark not done" : "Mark done"}>{a.is_completed ? "↺" : "✓"}</button></ActionForm>
              <span style={a.is_completed ? { textDecoration: "line-through", opacity: 0.7 } : undefined}>{a.title}</span>
            </div>
            <div className="row">
              <ActionForm action={moveAgendaItem} inline><input type="hidden" name="id" value={a.id} /><input type="hidden" name="event_id" value={id} /><input type="hidden" name="dir" value="up" /><button className="btn secondary sm" aria-label="Move up">↑</button></ActionForm>
              <ActionForm action={moveAgendaItem} inline><input type="hidden" name="id" value={a.id} /><input type="hidden" name="event_id" value={id} /><input type="hidden" name="dir" value="down" /><button className="btn secondary sm" aria-label="Move down">↓</button></ActionForm>
              <ActionForm action={deleteAgendaItem} inline><input type="hidden" name="id" value={a.id} /><button className="btn secondary sm">Remove</button></ActionForm>
            </div>
          </li>
        ))}</ul>}
        <ActionForm action={addAgendaItem} className="row" resetOnSuccess submitLabel="Add item"><input type="hidden" name="event_id" value={id} /><input name="title" placeholder="Agenda item" required style={{ maxWidth: 360 }} aria-label="Agenda item" /></ActionForm>
      </div>
      {(["preparation", "follow_up"] as const).map((rel) => {
        const rows = rel === "preparation" ? prep : fol;
        return (
          <div className="card" key={rel}>
            <h2><Dot kind="review" />{rel === "preparation" ? "Preparation tasks" : "Follow-up tasks"}</h2>
            {rows.length === 0 ? <p className="muted">None yet.</p> : <ul className="list">{rows.map((l) => <TaskRow key={l.tasks!.id} t={l.tasks!} tz={tz} />)}</ul>}
            <ActionForm action={addEventTask} className="row" resetOnSuccess submitLabel="Add task">
              <input type="hidden" name="event_id" value={id} /><input type="hidden" name="relation" value={rel} />
              <input name="title" required placeholder="Task title" style={{ maxWidth: 280 }} aria-label="Task title" />
              <Field label="Due"><input name="due_at" type="datetime-local" /></Field>
            </ActionForm>
          </div>
        );
      })}
      <div className="card">
        <h3>Linked notes</h3>
        {linkedNotes.length === 0 ? <p className="muted small">None linked.</p> : <ul className="list">{linkedNotes.map((n) => <li key={n.id}><Link className="plain" href={`/notes/${n.id}`}>{n.title}</Link><ActionForm action={removeNoteLink} inline><input type="hidden" name="note_id" value={n.id} /><input type="hidden" name="target_id" value={id} /><input type="hidden" name="kind" value="event" /><button className="btn secondary sm">Unlink</button></ActionForm></li>)}</ul>}
        {options.length > 0 && <ActionForm action={addNoteLink} className="row"><input type="hidden" name="target_id" value={id} /><input type="hidden" name="kind" value="event" /><select name="note_id" aria-label="Link note" style={{ maxWidth: 260 }}>{options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select><button className="btn sm">Link</button></ActionForm>}
      </div>
      <div className="card"><ActionForm action={deleteEvent} confirm="Delete this meeting, its agenda and reminders?" submitLabel="Delete meeting" submitClass="btn danger"><input type="hidden" name="id" value={id} /></ActionForm></div>
    </>
  );
}
