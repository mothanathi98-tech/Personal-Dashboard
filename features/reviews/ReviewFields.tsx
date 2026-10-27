import { Field } from "@/components/ui";
import type { Database } from "@/types/database";

type Review = Database["public"]["Tables"]["reviews"]["Row"];

export default function ReviewFields({ review, categories, projects }: { review?: Review | null; categories: { id: string; name: string }[]; projects: { id: string; name: string }[] }) {
  return (
    <div className="stack">
      {review && <input type="hidden" name="id" value={review.id} />}
      <Field label="Title"><input name="title" required maxLength={300} defaultValue={review?.title} /></Field>
      <Field label="Description"><textarea name="description" defaultValue={review?.description ?? ""} /></Field>
      <div className="fields">
        <Field label="Review date / deadline" hint="Optional"><input name="review_date" type="date" defaultValue={review?.review_date ?? ""} /></Field>
        <Field label="Category"><select name="category_id" defaultValue={review?.category_id ?? ""}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Project"><select name="project_id" defaultValue={review?.project_id ?? ""}><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Status"><select name="status" defaultValue={review?.status ?? "upcoming"}><option value="upcoming">Upcoming</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field>
      </div>
      {review && <Field label="Review notes"><textarea name="notes" defaultValue={review.notes ?? ""} style={{ minHeight: 160 }} /></Field>}
    </div>
  );
}
