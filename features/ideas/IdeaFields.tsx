import { Field } from "@/components/ui";
import type { Database } from "@/types/database";

type Idea = Database["public"]["Tables"]["ideas"]["Row"];

export default function IdeaFields({ idea, categories, projects, tags }: { idea?: Idea | null; categories: { id: string; name: string }[]; projects: { id: string; name: string }[]; tags?: string[] }) {
  return (
    <div className="stack">
      {idea && <input type="hidden" name="id" value={idea.id} />}
      <Field label="Title"><input name="title" required maxLength={300} defaultValue={idea?.title} /></Field>
      <Field label="Details"><textarea name="content" defaultValue={idea?.content ?? ""} style={{ minHeight: 160 }} /></Field>
      <div className="fields">
        <Field label="Category"><select name="category_id" defaultValue={idea?.category_id ?? ""}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Status"><select name="status" defaultValue={idea?.status ?? "raw_idea"}>
          <option value="raw_idea">Raw Idea</option><option value="exploring">Exploring</option><option value="validating">Validating</option><option value="ready_to_build">Ready to Build</option><option value="in_progress">In Progress</option><option value="implemented">Implemented</option><option value="archived">Archived</option></select></Field>
        <Field label="Project"><select name="project_id" defaultValue={idea?.project_id ?? ""}><option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Tags" hint="Comma separated"><input name="tags" defaultValue={(tags ?? []).join(", ")} /></Field>
      </div>
      <div className="row">
        <label className="row small"><input type="checkbox" name="use_color" value="1" defaultChecked={!!idea?.color} /> Override category colour</label>
        <input name="color" type="color" defaultValue={idea?.color ?? "#22804A"} style={{ width: 48, padding: 2 }} aria-label="Idea colour" />
      </div>
    </div>
  );
}
