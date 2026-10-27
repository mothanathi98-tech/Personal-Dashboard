import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Dot, Empty, PageHeader, Progress, Tabs, label } from "@/components/ui";
import { formatDateOnly } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { saveProject } from "@/features/projects/actions";
import ProjectFields from "@/features/projects/ProjectFields";

const TABS = [["open", "Open"], ["planning", "Planning"], ["active", "Active"], ["on_hold", "On Hold"], ["completed", "Completed"], ["archived", "Archived"], ["all", "All"]] as const;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ s?: string; category?: string }> }) {
  const sp = await searchParams;
  const { supabase, categories } = await getCtx();
  const s = TABS.some(([k]) => k === sp.s) ? sp.s! : "open";
  let q = supabase.from("projects").select("*").order("updated_at", { ascending: false });
  if (s === "open") q = q.in("status", ["planning", "active", "on_hold"]); else if (s !== "all") q = q.eq("status", s);
  if (sp.category) q = q.eq("category_id", sp.category);
  const [{ data: projects, error }, { data: prog }] = await Promise.all([q, supabase.from("project_progress").select("project_id,pct,basis")]);
  const pmap = new Map((prog ?? []).map((p) => [p.project_id!, p]));
  const cat = (id: string | null) => categories.find((c) => c.id === id);
  return (
    <>
      <PageHeader title="Projects" subtitle="Progress = weighted milestones if any exist, otherwise done ÷ non-cancelled tasks." />
      <details className="card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ New project</summary>
        <div style={{ marginTop: 12 }}><ActionForm action={saveProject} resetOnSuccess submitLabel="Create project"><ProjectFields categories={categories} /></ActionForm></div>
      </details>
      <Tabs current={s} items={TABS.map(([k, l]) => ({ key: k, label: l, href: `/projects?s=${k}${sp.category ? `&category=${sp.category}` : ""}` }))} />
      {error && <p className="err" role="alert">⚠ Could not load projects.</p>}
      {!error && (projects ?? []).length === 0 && <Empty title="No projects here" hint="Create one above to group tasks, notes and meetings." />}
      <div className="grid cols-3">
        {(projects ?? []).map((p) => {
          const pr = pmap.get(p.id);
          return (
            <article key={p.id} className="card">
              <div className="row between"><h3><Dot color={p.color ?? cat(p.category_id)?.color} /><Link className="plain" href={`/projects/${p.id}`}>{p.name}</Link></h3><span className="badge">{label(p.status)}</span></div>
              {p.description && <p className="muted small" style={{ margin: "4px 0 8px" }}>{p.description.slice(0, 140)}</p>}
              <Progress pct={pr?.pct ?? 0} />
              <p className="small muted" style={{ margin: "6px 0 0" }}>{pr?.pct ?? 0}% · based on {pr?.basis ?? "tasks"}{p.target_date ? ` · target ${formatDateOnly(p.target_date)}` : ""}</p>
            </article>
          );
        })}
      </div>
    </>
  );
}
