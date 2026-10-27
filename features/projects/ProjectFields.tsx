import { Field } from "@/components/ui";
import type { Database } from "@/types/database";

type Project = Database["public"]["Tables"]["projects"]["Row"];

export default function ProjectFields({ project, categories }: { project?: Project | null; categories: { id: string; name: string }[] }) {
  return (
    <div className="stack">
      {project && <input type="hidden" name="id" value={project.id} />}
      <Field label="Name"><input name="name" required maxLength={200} defaultValue={project?.name} /></Field>
      <Field label="Description"><textarea name="description" defaultValue={project?.description ?? ""} /></Field>
      <div className="fields">
        <Field label="Category"><select name="category_id" defaultValue={project?.category_id ?? ""}><option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Status"><select name="status" defaultValue={project?.status ?? "planning"}><option value="planning">Planning</option><option value="active">Active</option><option value="on_hold">On Hold</option><option value="completed">Completed</option><option value="archived">Archived</option></select></Field>
        <Field label="Start date"><input name="start_date" type="date" defaultValue={project?.start_date ?? ""} /></Field>
        <Field label="Target date"><input name="target_date" type="date" defaultValue={project?.target_date ?? ""} /></Field>
        <Field label="Display colour"><input name="color" type="color" defaultValue={project?.color ?? "#22804A"} /></Field>
      </div>
    </div>
  );
}
