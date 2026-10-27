import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm from "@/components/ActionForm";
import { PageHeader } from "@/components/ui";
import { getCtx } from "@/lib/permissions/owner";
import { addReviewTask, deleteReview, removeReviewTask, saveReview, setReviewStatus } from "@/features/reviews/actions";
import ReviewFields from "@/features/reviews/ReviewFields";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, categories } = await getCtx();
  const { data: review } = await supabase.from("reviews").select("*").eq("id", id).maybeSingle();
  if (!review) notFound();
  const [{ data: projects }, { data: links }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("id,name").is("archived_at", null).order("name"),
    supabase.from("review_tasks").select("tasks(id,title,status)").eq("review_id", id),
    supabase.from("tasks").select("id,title").is("archived_at", null).order("updated_at", { ascending: false }).limit(100),
  ]);
  const linked = (links ?? []).map((l) => (l as unknown as { tasks: { id: string; title: string; status: string } | null }).tasks).filter((t): t is { id: string; title: string; status: string } => !!t);
  const have = new Set(linked.map((t) => t.id)); const options = (tasks ?? []).filter((t) => !have.has(t.id));
  return (
    <>
      <PageHeader title={review.title} subtitle={review.completed_at ? "Completed" : undefined} actions={<Link href="/reviews" className="btn secondary sm">← Reviews</Link>} />
      <div className="card">
        <ActionForm action={setReviewStatus} inline><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={review.status === "completed" ? "upcoming" : "completed"} /><button className="btn sm">{review.status === "completed" ? "Reopen review" : "Mark completed"}</button></ActionForm>
      </div>
      <div className="card"><ActionForm action={saveReview} submitLabel="Save review"><ReviewFields review={review} categories={categories} projects={projects ?? []} /></ActionForm></div>
      <div className="card">
        <h3>Linked tasks</h3>
        {linked.length === 0 ? <p className="muted small">None linked.</p> : <ul className="list">{linked.map((t) => <li key={t.id}><Link className="plain" href={`/tasks/${t.id}`}>{t.title}</Link><ActionForm action={removeReviewTask} inline><input type="hidden" name="review_id" value={id} /><input type="hidden" name="task_id" value={t.id} /><button className="btn secondary sm">Unlink</button></ActionForm></li>)}</ul>}
        {options.length > 0 && <ActionForm action={addReviewTask} className="row"><input type="hidden" name="review_id" value={id} /><select name="task_id" aria-label="Link task" style={{ maxWidth: 280 }}>{options.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}</select><button className="btn sm">Link</button></ActionForm>}
      </div>
      <div className="card"><ActionForm action={deleteReview} confirm="Delete this review?" submitLabel="Delete review" submitClass="btn danger"><input type="hidden" name="id" value={id} /></ActionForm></div>
    </>
  );
}
