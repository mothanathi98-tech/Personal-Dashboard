import Link from "next/link";
import { Dot, Empty, PageHeader, label } from "@/components/ui";
import { formatDateTime, localToUtc } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";

type SP = { q?: string; kind?: string | string[]; category?: string; status?: string; priority?: string; project?: string; tag?: string; from?: string; to?: string };
const KINDS = [["task", "Tasks"], ["project", "Projects"], ["idea", "Ideas"], ["note", "Notes"], ["meeting", "Meetings"], ["review", "Reviews"]] as const;
const HREF: Record<string, string> = { task: "/tasks", project: "/projects", idea: "/brainstorm", note: "/notes", meeting: "/meetings", review: "/reviews" };

/** ts_headline marks matches with <b>…</b>; render them as <mark> without ever injecting raw HTML. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(<b>.*?<\/b>)/g);
  return <>{parts.map((p, i) => (p.startsWith("<b>") ? <mark key={i}>{p.slice(3, -4)}</mark> : <span key={i}>{p.replace(/<\/?b>/g, "")}</span>))}</>;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, categories, tz } = await getCtx();
  const kinds = [sp.kind ?? []].flat().filter((k) => KINDS.some(([x]) => x === k));
  const q = sp.q?.trim() ?? "";
  const { data: projects } = await supabase.from("projects").select("id,name").order("name");
  let results: { kind: string; id: string; title: string; snippet: string; category_id: string | null; status: string; priority: string | null; at: string | null }[] = [];
  let failed = false;
  if (q) {
    const { data, error } = await supabase.rpc("global_search", {
      q, p_kinds: kinds.length ? kinds : undefined, p_category: sp.category || undefined, p_status: sp.status || undefined, p_priority: sp.priority || undefined,
      p_project: sp.project || undefined, p_tag: sp.tag || undefined,
      p_from: /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? localToUtc(sp.from!, tz).toISOString() : undefined,
      p_to: /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? localToUtc(sp.to + "T23:59", tz).toISOString() : undefined, p_limit: 60,
    });
    if (error) failed = true; else results = data ?? [];
  }
  const cat = (id: string | null) => categories.find((c) => c.id === id);
  return (
    <>
      <PageHeader title="Search" subtitle="Tasks, projects, ideas, notes, meetings and reviews." />
      <form method="get" className="card stack">
        <div className="row"><input name="q" defaultValue={q} placeholder="Search everything…" aria-label="Search" style={{ maxWidth: 420 }} autoFocus /><button className="btn">Search</button></div>
        <div className="row">{KINDS.map(([k, l]) => <label key={k} className="row small"><input type="checkbox" name="kind" value={k} defaultChecked={kinds.includes(k)} />{l}</label>)}</div>
        <div className="fields">
          <select name="category" defaultValue={sp.category ?? ""} aria-label="Category"><option value="">Any category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select name="project" defaultValue={sp.project ?? ""} aria-label="Project"><option value="">Any project</option>{(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select name="priority" defaultValue={sp.priority ?? ""} aria-label="Priority"><option value="">Any priority</option><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
          <input name="status" defaultValue={sp.status} placeholder="Status (e.g. todo, active)" aria-label="Status" />
          <input name="tag" defaultValue={sp.tag} placeholder="Tag" aria-label="Tag" />
          <label className="field"><span className="small">From</span><input name="from" type="date" defaultValue={sp.from} /></label>
          <label className="field"><span className="small">To</span><input name="to" type="date" defaultValue={sp.to} /></label>
        </div>
      </form>
      {failed && <p className="err" role="alert">⚠ Search failed. Try again.</p>}
      {q && !failed && results.length === 0 && <Empty title="No matches" hint="Try fewer words or remove filters." />}
      {results.length > 0 && <div className="card" style={{ marginTop: 14 }}><ul className="list">{results.map((r) => (
        <li key={`${r.kind}${r.id}`} style={{ display: "block" }}>
          <div className="row"><Dot kind={r.kind === "meeting" ? "meeting" : r.kind === "review" ? "review" : "category"} color={cat(r.category_id)?.color} />
            <Link className="plain" href={`${HREF[r.kind]}/${r.id}`}>{r.title}</Link><span className="badge">{KINDS.find(([k]) => k === r.kind)?.[1].replace(/s$/, "")}</span>
            <span className="badge">{label(r.status)}</span>{cat(r.category_id) && <span className="badge">{cat(r.category_id)!.name}</span>}{r.at && <span className="small muted">{formatDateTime(r.at, tz)}</span>}</div>
          {r.snippet && <p className="small muted" style={{ margin: "4px 0 0" }}><Snippet text={r.snippet} /></p>}
        </li>))}</ul></div>}
    </>
  );
}
