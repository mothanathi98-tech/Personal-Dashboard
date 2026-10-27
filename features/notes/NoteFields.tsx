import { Field } from "@/components/ui";
import type { Database } from "@/types/database";

type Note = Database["public"]["Tables"]["notes"]["Row"];

export default function NoteFields({ note, categories, projects, tags }: { note?: Note | null; categories: { id: string; name: string }[]; projects: { id: string; name: string }[]; tags?: string[] }) {
  return (
    <div className="stack" key={note?.updated_at}>
      {note && <><input type="hidden" name="id" value={note.id} /><input type="hidden" name="expected_updated_at" value={note.updated_at} /></>}
      <Field label="Title"><input name="title" required maxLength={300} defaultValue={note?.title} /></Field>
      <Field label="Content (plain text or Markdown)"><textarea name="content" defaultValue={note?.content ?? ""} style={{ minHeight: note ? 320 : 140, fontFamily: "ui-monospace, monospace" }} /></Field>
      <div className="fields">
        <Field label="Category"><select name="category_id" defaultValue={note?.category_id ?? ""}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Project"><select name="project_id" defaultValue={note?.project_id ?? ""}><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Tags" hint="Comma separated"><input name="tags" defaultValue={(tags ?? []).join(", ")} /></Field>
      </div>
    </div>
  );
}
