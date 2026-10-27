import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm from "@/components/ActionForm";
import UnsavedBadge from "@/components/UnsavedBadge";
import { PageHeader } from "@/components/ui";
import { getCtx } from "@/lib/permissions/owner";
import { loadTags } from "@/lib/tags";
import { deleteNote, saveNote } from "@/features/notes/actions";
import NoteFields from "@/features/notes/NoteFields";
import NoteLinks from "@/features/notes/NoteLinks";

type J<K extends string> = { [k in K]: { id: string; title: string } | null };

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, categories } = await getCtx();
  const { data: note } = await supabase.from("notes").select("*").eq("id", id).maybeSingle();
  if (!note) notFound();
  const [{ data: projects }, tagMap, tl, il, el, tasks, ideas, events] = await Promise.all([
    supabase.from("projects").select("id,name").is("archived_at", null).order("name"), loadTags(supabase, "note", [id]),
    supabase.from("task_notes").select("tasks(id,title)").eq("note_id", id), supabase.from("idea_notes").select("ideas(id,title)").eq("note_id", id), supabase.from("event_notes").select("events(id,title)").eq("note_id", id),
    supabase.from("tasks").select("id,title").is("archived_at", null).order("updated_at", { ascending: false }).limit(100),
    supabase.from("ideas").select("id,title").is("archived_at", null).order("updated_at", { ascending: false }).limit(100),
    supabase.from("events").select("id,title").order("start_at", { ascending: false }).limit(100),
  ]);
  const pick = <K extends string>(rows: unknown[] | null, k: K) => (rows ?? []).map((r) => (r as J<K>)[k]).filter((x): x is { id: string; title: string } => !!x);
  return (
    <>
      <PageHeader title={note.title} actions={<Link href="/notes" className="btn secondary sm">← Notes</Link>} />
      <div className="card">
        <ActionForm action={saveNote} submitLabel="Save note" key={note.updated_at}>
          <NoteFields note={note} categories={categories} projects={projects ?? []} tags={tagMap.get(id)} />
          <p><UnsavedBadge /></p>
        </ActionForm>
      </div>
      <div className="grid cols-3">
        <NoteLinks noteId={id} kind="task" heading="Linked tasks" linked={pick(tl.data, "tasks")} candidates={tasks.data ?? []} />
        <NoteLinks noteId={id} kind="idea" heading="Linked ideas" linked={pick(il.data, "ideas")} candidates={ideas.data ?? []} />
        <NoteLinks noteId={id} kind="event" heading="Linked meetings" linked={pick(el.data, "events")} candidates={events.data ?? []} />
      </div>
      <div className="card"><ActionForm action={deleteNote} confirm="Delete this note permanently?" submitLabel="Delete note" submitClass="btn danger"><input type="hidden" name="id" value={id} /></ActionForm></div>
    </>
  );
}
