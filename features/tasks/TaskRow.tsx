import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Dot, label } from "@/components/ui";
import { formatDateTime, isOverdue } from "@/lib/dates";
import { archiveTask, completeTask, moveTask, reopenTask } from "./actions";

export type TaskItem = {
  id: string; title: string; status: string; priority: string; due_at: string | null; scheduled_at: string | null;
  archived_at: string | null; recurrence_rule: string | null; category_id: string | null; parent_task_id: string | null;
};

export default function TaskRow({ t, color, tz, tags, parentTitle, selectable, reorder }: {
  t: TaskItem; color?: string | null; tz: string; tags?: string[]; parentTitle?: string; selectable?: boolean; reorder?: boolean;
}) {
  const done = t.status === "done" || t.status === "cancelled";
  const overdue = isOverdue(t);
  return (
    <li>
      <div className="row" style={{ flex: 1, minWidth: 220 }}>
        {selectable && <input type="checkbox" name="ids" value={t.id} form="bulk-form" aria-label={`Select ${t.title}`} />}
        {done ? (
          <ActionForm action={reopenTask} inline><input type="hidden" name="id" value={t.id} /><button className="btn secondary sm" title="Reopen" aria-label={`Reopen ${t.title}`}>↺</button></ActionForm>
        ) : (
          <ActionForm action={completeTask} inline><input type="hidden" name="id" value={t.id} /><button className="btn sm" title="Complete" aria-label={`Complete ${t.title}`}>✓</button></ActionForm>
        )}
        <div>
          <Dot color={color} label="category" />
          <Link href={`/tasks/${t.id}`} className="plain" style={done ? { textDecoration: "line-through", opacity: 0.7 } : undefined}>{t.title}</Link>
          {parentTitle && <span className="small muted"> · subtask of {parentTitle}</span>}
          <div className="row small muted" style={{ gap: 6 }}>
            <span className="badge">{label(t.status)}</span>
            {(t.priority === "high" || t.priority === "urgent") && <span className={`badge ${t.priority === "urgent" ? "urgent" : ""}`}>{t.priority === "urgent" ? "Urgent" : "High"}</span>}
            {t.due_at && <span className={overdue ? "badge overdue" : "badge"}>{overdue ? "Overdue · " : "Due "}{formatDateTime(t.due_at, tz)}</span>}
            {t.scheduled_at && <span className="badge">Work {formatDateTime(t.scheduled_at, tz)}</span>}
            {t.recurrence_rule && <span className="badge">Repeats {t.recurrence_rule}</span>}
            {(tags ?? []).map((g) => <span key={g} className="badge">#{g}</span>)}
          </div>
        </div>
      </div>
      <div className="row">
        {reorder && (
          <>
            <ActionForm action={moveTask} inline><input type="hidden" name="id" value={t.id} /><input type="hidden" name="dir" value="up" /><button className="btn secondary sm" aria-label="Move up">↑</button></ActionForm>
            <ActionForm action={moveTask} inline><input type="hidden" name="id" value={t.id} /><input type="hidden" name="dir" value="down" /><button className="btn secondary sm" aria-label="Move down">↓</button></ActionForm>
          </>
        )}
        <ActionForm action={archiveTask} inline><input type="hidden" name="id" value={t.id} />{t.archived_at && <input type="hidden" name="unarchive" value="1" />}<button className="btn secondary sm">{t.archived_at ? "Restore" : "Archive"}</button></ActionForm>
      </div>
    </li>
  );
}
