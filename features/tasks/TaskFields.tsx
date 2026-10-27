import { Field } from "@/components/ui";
import { utcToLocalInput } from "@/lib/dates";
import type { Database } from "@/types/database";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
type Cat = { id: string; name: string };
type Opt = { id: string; name: string };

export default function TaskFields({ task, categories, projects, parents, tz, tags, defaults }: {
  task?: Task | null; categories: Cat[]; projects: Opt[]; parents: { id: string; title: string }[]; tz: string; tags?: string[];
  defaults?: Partial<{ project_id: string; category_id: string }>;
}) {
  const wd = task?.recurrence_weekdays ?? [];
  return (
    <div className="stack">
      {task && <input type="hidden" name="id" value={task.id} />}
      <Field label="Title"><input name="title" required maxLength={300} defaultValue={task?.title} /></Field>
      <Field label="Description"><textarea name="description" defaultValue={task?.description ?? ""} /></Field>
      <div className="fields">
        <Field label="Category">
          <select name="category_id" defaultValue={task?.category_id ?? defaults?.category_id ?? ""}>
            <option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Project">
          <select name="project_id" defaultValue={task?.project_id ?? defaults?.project_id ?? ""}>
            <option value="">None</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Parent task">
          <select name="parent_task_id" defaultValue={task?.parent_task_id ?? ""}>
            <option value="">None</option>{parents.filter((p) => p.id !== task?.id).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select name="status" defaultValue={task?.status ?? "todo"}>
            <option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="waiting">Waiting</option>
            <option value="done">Done</option><option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <Field label="Priority">
          <select name="priority" defaultValue={task?.priority ?? "medium"}>
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
          </select>
        </Field>
        <Field label="Estimate (minutes)"><input name="estimated_minutes" type="number" min={1} defaultValue={task?.estimated_minutes ?? ""} /></Field>
      </div>
      <div className="fields">
        <Field label="Due (deadline)" hint={`Optional. Your time zone: ${tz}`}><input name="due_at" type="datetime-local" defaultValue={utcToLocalInput(task?.due_at, tz)} /></Field>
        <Field label="Scheduled (when I'll work on it)"><input name="scheduled_at" type="datetime-local" defaultValue={utcToLocalInput(task?.scheduled_at, tz)} /></Field>
        <Field label="Reminder at" hint="Optional. Only set if you want a reminder."><input name="remind_at" type="datetime-local" defaultValue={utcToLocalInput(task?.remind_at, tz)} /></Field>
      </div>
      <div className="fields">
        <Field label="Repeat" hint="Needs a due or scheduled date.">
          <select name="recurrence_rule" defaultValue={task?.recurrence_rule ?? ""}>
            <option value="">Does not repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option><option value="weekdays">Selected weekdays</option>
          </select>
        </Field>
        <fieldset style={{ border: "1px solid var(--border)", borderRadius: 8 }}>
          <legend className="small muted">Weekdays (for “Selected weekdays”)</legend>
          <div className="row">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
              <label key={d} className="row small"><input type="checkbox" name="recurrence_weekdays" value={i} defaultChecked={wd.includes(i)} />{d}</label>
            ))}
          </div>
        </fieldset>
      </div>
      <Field label="Tags" hint="Comma separated"><input name="tags" defaultValue={(tags ?? []).join(", ")} /></Field>
    </div>
  );
}
