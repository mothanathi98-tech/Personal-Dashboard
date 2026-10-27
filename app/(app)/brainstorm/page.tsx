import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Dot, Empty, PageHeader, label } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { loadTags } from "@/lib/tags";
import { archiveIdea, saveIdea, toggleIdeaPin } from "@/features/ideas/actions";
import IdeaFields from "@/features/ideas/IdeaFields";

type SP = { v?: string; category?: string; status?: string; tag?: string; q?: string; archived?: string };

export default async function BrainstormPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, categories, tz } = await getCtx();
  const view = sp.v === "list" ? "list" : "cards";
  let q = supabase.from("ideas").select("*").order("is_pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(200);
  q = sp.archived === "1" ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  if (sp.category) q = q.eq("category_id", sp.category);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q?.trim()) q = q.textSearch("fts", sp.q.trim(), { type: "websearch", config: "english" });
  const [{ data: ideasRaw, error }, { data: projects }, { data: allTags }] = await Promise.all([
    q, supabase.from("projects").select("id,name").is("archived_at", null).order("name"), supabase.from("tags").select("name").order("name"),
  ]);
  let ideas = ideasRaw ?? [];
  const tagMap = await loadTags(supabase, "idea", ideas.map((i) => i.id));
  if (sp.tag) ideas = ideas.filter((i) => (tagMap.get(i.id) ?? []).some((t) => t.toLowerCase() === sp.tag!.toLowerCase()));
  const cat = (id: string | null) => categories.find((c) => c.id === id);
  const link = (over: Partial<SP>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ ...sp, ...over })) if (v) p.set(k, v); return `/brainstorm?${p}`; };
  return (
    <>
      <PageHeader title="Brainstorm" subtitle={`${ideas.length} ideas`} actions={<><Link className="btn secondary sm" href={link({ v: "cards" })}>Cards</Link><Link className="btn secondary sm" href={link({ v: "list" })}>List</Link><Link className="btn secondary sm" href={link({ archived: sp.archived === "1" ? "" : "1" })}>{sp.archived === "1" ? "Show active" : "Show archived"}</Link></>} />
      <details className="card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ Capture idea</summary>
        <div style={{ marginTop: 12 }}><ActionForm action={saveIdea} resetOnSuccess submitLabel="Save idea"><IdeaFields categories={categories} projects={projects ?? []} /></ActionForm></div>
      </details>
      <form method="get" className="row" style={{ marginBottom: 14 }}>
        <input type="hidden" name="v" value={view} />{sp.archived === "1" && <input type="hidden" name="archived" value="1" />}
        <input name="q" placeholder="Search ideas" defaultValue={sp.q} style={{ maxWidth: 220 }} aria-label="Search ideas" />
        <select name="category" defaultValue={sp.category ?? ""} aria-label="Category" style={{ maxWidth: 160 }}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Status" style={{ maxWidth: 170 }}><option value="">Any status</option>{["raw_idea", "exploring", "validating", "ready_to_build", "in_progress", "implemented"].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
        <select name="tag" defaultValue={sp.tag ?? ""} aria-label="Tag" style={{ maxWidth: 150 }}><option value="">Any tag</option>{(allTags ?? []).map((t) => <option key={t.name} value={t.name}>#{t.name}</option>)}</select>
        <button className="btn secondary sm">Apply</button><Link className="btn secondary sm" href="/brainstorm">Reset</Link>
      </form>
      {error && <p className="err" role="alert">⚠ Could not load ideas.</p>}
      {!error && ideas.length === 0 && <Empty title="No ideas yet" hint="Capture business or personal ideas here, then convert the good ones into tasks or projects." />}
      <div className={view === "cards" ? "grid cols-3" : "card"}>
        {view === "list" ? <ul className="list">{ideas.map((i) => <IdeaLine key={i.id} i={i} color={i.color ?? cat(i.category_id)?.color} cat={cat(i.category_id)?.name} tags={tagMap.get(i.id)} tz={tz} />)}</ul>
          : ideas.map((i) => (
            <article key={i.id} className="card" style={{ marginTop: 0 }}>
              <div className="row between"><h3><Dot color={i.color ?? cat(i.category_id)?.color} />{i.is_pinned && "📌 "}<Link className="plain" href={`/brainstorm/${i.id}`}>{i.title}</Link></h3><span className="badge">{label(i.status)}</span></div>
              {i.content && <p className="muted small">{i.content.slice(0, 160)}{i.content.length > 160 ? "…" : ""}</p>}
              <div className="row small muted">{cat(i.category_id) && <span className="badge">{cat(i.category_id)!.name}</span>}{(tagMap.get(i.id) ?? []).map((t) => <span key={t} className="badge">#{t}</span>)}{(i.converted_task_id || i.converted_project_id) && <span className="badge ok">Converted</span>}</div>
              <PinArchive i={i} />
            </article>
          ))}
      </div>
    </>
  );
}

type IdeaRow = { id: string; title: string; status: string; is_pinned: boolean; archived_at: string | null; updated_at: string; converted_task_id: string | null; converted_project_id: string | null };
function PinArchive({ i }: { i: IdeaRow }) {
  return (
    <div className="row" style={{ marginTop: 8 }}>
      <ActionForm action={toggleIdeaPin} inline><input type="hidden" name="id" value={i.id} /><input type="hidden" name="pin" value={i.is_pinned ? "0" : "1"} /><button className="btn secondary sm">{i.is_pinned ? "Unpin" : "Pin"}</button></ActionForm>
      <ActionForm action={archiveIdea} inline><input type="hidden" name="id" value={i.id} />{i.archived_at && <input type="hidden" name="restore" value="1" />}<button className="btn secondary sm">{i.archived_at ? "Restore" : "Archive"}</button></ActionForm>
    </div>
  );
}
function IdeaLine({ i, color, cat, tags, tz }: { i: IdeaRow; color?: string | null; cat?: string; tags?: string[]; tz: string }) {
  return (
    <li><div><Dot color={color} />{i.is_pinned && "📌 "}<Link className="plain" href={`/brainstorm/${i.id}`}>{i.title}</Link>
      <div className="row small muted"><span className="badge">{label(i.status)}</span>{cat && <span className="badge">{cat}</span>}{(tags ?? []).map((t) => <span key={t} className="badge">#{t}</span>)}<span>{formatDate(i.updated_at, tz)}</span></div></div><PinArchive i={i} /></li>
  );
}
