import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Dot, Empty, PageHeader } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { loadTags } from "@/lib/tags";
import { archiveNote, saveNote, toggleNotePin } from "@/features/notes/actions";
import NoteFields from "@/features/notes/NoteFields";

type SP = { q?: string; category?: string; project?: string; tag?: string; archived?: string };

export default async function NotesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, categories, tz } = await getCtx();
  let q = supabase.from("notes").select("id,title,content,is_pinned,category_id,project_id,updated_at,archived_at").order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(200);
  q = sp.archived === "1" ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  if (sp.category) q = q.eq("category_id", sp.category);
  if (sp.project) q = q.eq("project_id", sp.project);
  if (sp.q?.trim()) q = q.textSearch("fts", sp.q.trim(), { type: "websearch", config: "english" });
  const [{ data: raw, error }, { data: projects }, { data: allTags }] = await Promise.all([q, supabase.from("projects").select("id,name").is("archived_at", null).order("name"), supabase.from("tags").select("name").order("name")]);
  let notes = raw ?? [];
  const tagMap = await loadTags(supabase, "note", notes.map((n) => n.id));
  if (sp.tag) notes = notes.filter((n) => (tagMap.get(n.id) ?? []).some((t) => t.toLowerCase() === sp.tag!.toLowerCase()));
  const color = (id: string | null) => categories.find((c) => c.id === id)?.color;
  return (
    <>
      <PageHeader title="Notes" subtitle={sp.q ? `Results for “${sp.q}”` : "Recently edited first; pinned on top."} actions={<Link className="btn secondary sm" href={sp.archived === "1" ? "/notes" : "/notes?archived=1"}>{sp.archived === "1" ? "Show active" : "Show archived"}</Link>} />
      <details className="card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ New note</summary>
        <div style={{ marginTop: 12 }}><ActionForm action={saveNote} resetOnSuccess submitLabel="Create note"><NoteFields categories={categories} projects={projects ?? []} /></ActionForm></div>
      </details>
      <form method="get" className="row" style={{ marginBottom: 14 }}>
        {sp.archived === "1" && <input type="hidden" name="archived" value="1" />}
        <input name="q" placeholder="Search titles and content" defaultValue={sp.q} style={{ maxWidth: 260 }} aria-label="Search notes" />
        <select name="category" defaultValue={sp.category ?? ""} aria-label="Category" style={{ maxWidth: 160 }}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="project" defaultValue={sp.project ?? ""} aria-label="Project" style={{ maxWidth: 160 }}><option value="">All projects</option>{(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="tag" defaultValue={sp.tag ?? ""} aria-label="Tag" style={{ maxWidth: 140 }}><option value="">Any tag</option>{(allTags ?? []).map((t) => <option key={t.name} value={t.name}>#{t.name}</option>)}</select>
        <button className="btn secondary sm">Apply</button><Link className="btn secondary sm" href="/notes">Reset</Link>
      </form>
      {error && <p className="err" role="alert">⚠ Could not load notes.</p>}
      {!error && notes.length === 0 && <Empty title="No notes found" hint="Write down what you learn, decisions, and meeting prep." />}
      <div className="grid cols-3">
        {notes.map((n) => (
          <article key={n.id} className="card" style={{ marginTop: 0 }}>
            <h3><Dot color={color(n.category_id)} />{n.is_pinned && "📌 "}<Link className="plain" href={`/notes/${n.id}`}>{n.title}</Link></h3>
            <p className="muted small" style={{ whiteSpace: "pre-wrap" }}>{n.content.slice(0, 140)}{n.content.length > 140 ? "…" : ""}</p>
            <div className="row small muted">{(tagMap.get(n.id) ?? []).map((t) => <span key={t} className="badge">#{t}</span>)}<span>{formatDateTime(n.updated_at, tz)}</span></div>
            <div className="row" style={{ marginTop: 8 }}>
              <ActionForm action={toggleNotePin} inline><input type="hidden" name="id" value={n.id} /><input type="hidden" name="pin" value={n.is_pinned ? "0" : "1"} /><button className="btn secondary sm">{n.is_pinned ? "Unpin" : "Pin"}</button></ActionForm>
              <ActionForm action={archiveNote} inline><input type="hidden" name="id" value={n.id} />{n.archived_at && <input type="hidden" name="restore" value="1" />}<button className="btn secondary sm">{n.archived_at ? "Restore" : "Archive"}</button></ActionForm>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
