import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Dot, Empty, PageHeader, Tabs, label } from "@/components/ui";
import { formatDateOnly, todayStr } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { saveReview, setReviewStatus } from "@/features/reviews/actions";
import ReviewFields from "@/features/reviews/ReviewFields";

const TABS = [["open", "Open"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["all", "All / history"]] as const;

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ s?: string; q?: string; category?: string }> }) {
  const sp = await searchParams;
  const s = TABS.some(([k]) => k === sp.s) ? sp.s! : "open";
  const { supabase, categories, tz } = await getCtx();
  let q = supabase.from("reviews").select("id,title,status,review_date,category_id").order("review_date", { ascending: true, nullsFirst: false }).limit(200);
  if (s === "open") q = q.in("status", ["upcoming", "in_progress"]); else if (s !== "all") q = q.eq("status", s);
  if (sp.category) q = q.eq("category_id", sp.category);
  if (sp.q?.trim()) q = q.ilike("title", `%${sp.q.trim().replace(/[%_\\]/g, "\\$&")}%`);
  const [{ data: reviews, error }, { data: projects }] = await Promise.all([q, supabase.from("projects").select("id,name").is("archived_at", null).order("name")]);
  const today = todayStr(tz);
  return (
    <>
      <PageHeader title="Reviews" subtitle="Things to check, prepare or look back on." actions={<Link className="btn" href="/reviews/weekly">Weekly review</Link>} />
      <details className="card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ New review</summary>
        <div style={{ marginTop: 12 }}><ActionForm action={saveReview} resetOnSuccess submitLabel="Create review"><ReviewFields categories={categories} projects={projects ?? []} /></ActionForm></div>
      </details>
      <Tabs current={s} items={TABS.map(([k, l]) => ({ key: k, label: l, href: `/reviews?s=${k}` }))} />
      <form method="get" className="row" style={{ marginBottom: 14 }}>
        <input type="hidden" name="s" value={s} /><input name="q" placeholder="Search reviews" defaultValue={sp.q} style={{ maxWidth: 220 }} aria-label="Search reviews" />
        <select name="category" defaultValue={sp.category ?? ""} aria-label="Category" style={{ maxWidth: 160 }}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button className="btn secondary sm">Apply</button>
      </form>
      {error && <p className="err" role="alert">⚠ Could not load reviews.</p>}
      {!error && (reviews ?? []).length === 0 && <Empty title="No reviews here" />}
      {(reviews ?? []).length > 0 && <div className="card"><ul className="list">{reviews!.map((r) => {
        const late = r.review_date && r.review_date < today && (r.status === "upcoming" || r.status === "in_progress");
        return (
          <li key={r.id}><div><Dot kind="review" /><Link className="plain" href={`/reviews/${r.id}`}>{r.title}</Link>
            <div className="row small muted"><span className="badge">{label(r.status)}</span>{r.review_date && <span className={late ? "badge overdue" : "badge"}>{late ? "Overdue · " : ""}{formatDateOnly(r.review_date)}</span>}</div></div>
            <ActionForm action={setReviewStatus} inline><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={r.status === "completed" ? "upcoming" : "completed"} /><button className={r.status === "completed" ? "btn secondary sm" : "btn sm"}>{r.status === "completed" ? "Reopen" : "Complete"}</button></ActionForm></li>
        );
      })}</ul></div>}
    </>
  );
}
