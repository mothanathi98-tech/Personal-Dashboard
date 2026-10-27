import { Field } from "@/components/ui";
import { utcToLocalInput } from "@/lib/dates";
import type { Database } from "@/types/database";

type Ev = Database["public"]["Tables"]["events"]["Row"];

export default function EventFields({ ev, categories, projects, tz, full }: { ev?: Ev | null; categories: { id: string; name: string }[]; projects: { id: string; name: string }[]; tz: string; full?: boolean }) {
  return (
    <div className="stack">
      {ev && <input type="hidden" name="id" value={ev.id} />}
      <Field label="Title"><input name="title" required maxLength={300} defaultValue={ev?.title} /></Field>
      <div className="fields">
        <Field label="Starts" hint={`Time zone: ${tz}`}><input name="start_at" type="datetime-local" required defaultValue={utcToLocalInput(ev?.start_at, tz)} /></Field>
        <Field label="Ends"><input name="end_at" type="datetime-local" defaultValue={utcToLocalInput(ev?.end_at, tz)} /></Field>
        <Field label="Location"><input name="location" defaultValue={ev?.location ?? ""} /></Field>
        <Field label="Meeting link"><input name="meeting_url" type="url" placeholder="https://" defaultValue={ev?.meeting_url ?? ""} /></Field>
        <Field label="Category"><select name="category_id" defaultValue={ev?.category_id ?? ""}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Project"><select name="project_id" defaultValue={ev?.project_id ?? ""}><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Status"><select name="status" defaultValue={ev?.status ?? "upcoming"}><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field>
        <Field label="Follow-up date" hint="Optional"><input name="follow_up_at" type="datetime-local" defaultValue={utcToLocalInput(ev?.follow_up_at, tz)} /></Field>
      </div>
      <Field label="Description"><textarea name="description" defaultValue={ev?.description ?? ""} /></Field>
      {full && (
        <>
          <Field label="Minutes / notes"><textarea name="minutes" defaultValue={ev?.minutes ?? ""} style={{ minHeight: 160 }} /></Field>
          <Field label="Decisions"><textarea name="decisions" defaultValue={ev?.decisions ?? ""} /></Field>
        </>
      )}
    </div>
  );
}
