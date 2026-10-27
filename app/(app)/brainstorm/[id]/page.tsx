import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm from "@/components/ActionForm";
import { PageHeader } from "@/components/ui";
import { getCtx } from "@/lib/permissions/owner";
import { loadTags } from "@/lib/tags";
import { convertIdea, deleteIdea, saveIdea } from "@/features/ideas/actions";
import IdeaFields from "@/features/ideas/IdeaFields";
import { addIdeaNote, removeIdeaNote } from "@/features/ideas/links";

export default async function IdeaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, categories } = await getCtx();
  const { data: idea } = await supabase.from("ideas").select("*").eq("id", id).maybeSingle();
  if (!idea) notFound();
  const [{ data: projects }, tagMap, { data: links }, { data: notes }] = await Promise.all([
    supabase.from("projects").select("id,name").is("archived_at", null).order("name"), loadTags(supabase, "idea", [id]),
    supabase.from("idea_notes").select("note_id, notes(id,title)").eq("idea_id", id),
    supabase.from("notes").select("id,title").is("archived_at", null).order("updated_at", { ascending: false }).limit(100),
  ]);
  const linked = (links ?? []).map((l) => (l as unknown as { notes: { id: string; title: string } | null }).notes).filter((n): n is { id: string; title: string } => !!n);
  return (
    <>
      <PageHeader title={idea.title} actions={<Link href="/brainstorm" className="btn secondary sm">← Brainstorm</Link>} />
      <div className="card"><ActionForm action={saveIdea} submitLabel="Save idea"><IdeaFields idea={idea} categories={categories} projects={projects ?? []} tags={tagMap.get(id)} /></ActionForm></div>
      <div className="card">
        <h2>Turn into action</h2>
        <p className="muted small">The idea is kept either way. Converting twice opens the existing record.</p>
        <div className="row">
          <ActionForm action={convertIdea} inline><input type="hidden" name="id" value={id} /><input type="hidden" name="to" value="task" /><button className="btn">{idea.converted_task_id ? "Open task" : "Convert to task"}</button></ActionForm>
          <ActionForm action={convertIdea} inline><input type="hidden" name="id" value={id} /><input type="hidden" name="to" value="project" /><button className="btn">{idea.converted_project_id ? "Open project" : "Convert to project"}</button></ActionForm>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>
          {idea.converted_task_id && <>Task: <Link href={`/tasks/${idea.converted_task_id}`}>open</Link>. </>}
          {idea.converted_project_id && <>Project: <Link href={`/projects/${idea.converted_project_id}`}>open</Link>.</>}
        </p>
      </div>
      <IdeaNotes ideaId={id} linked={linked} candidates={notes ?? []} />
      <div className="card"><ActionForm action={deleteIdea} confirm="Delete this idea? Tasks/projects created from it are kept." submitLabel="Delete idea" submitClass="btn danger"><input type="hidden" name="id" value={id} /></ActionForm></div>
    </>
  );
}

function IdeaNotes({ ideaId, linked, candidates }: { ideaId: string; linked: { id: string; title: string }[]; candidates: { id: string; title: string }[] }) {
  const have = new Set(linked.map((l) => l.id)); const options = candidates.filter((c) => !have.has(c.id));
  return (
    <div className="card"><h3>Linked notes</h3>
      {linked.length === 0 ? <p className="muted small">None linked.</p> : <ul className="list">{linked.map((n) => <li key={n.id}><Link className="plain" href={`/notes/${n.id}`}>{n.title}</Link><ActionForm action={removeIdeaNote} inline><input type="hidden" name="idea_id" value={ideaId} /><input type="hidden" name="note_id" value={n.id} /><button className="btn secondary sm">Unlink</button></ActionForm></li>)}</ul>}
      {options.length > 0 && <ActionForm action={addIdeaNote} className="row"><input type="hidden" name="idea_id" value={ideaId} /><select name="note_id" aria-label="Link note" style={{ maxWidth: 260 }}>{options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select><button className="btn sm">Link</button></ActionForm>}
    </div>
  );
}
