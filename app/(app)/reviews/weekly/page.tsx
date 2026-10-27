import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Dot, Field, PageHeader, Progress } from "@/components/ui";
import { addDays, formatDateOnly, formatDateTime, isOverdue, localToUtc, todayStr, weekStartOf } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { saveWeeklyReview } from "@/features/reviews/actions";

function S({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: boolean }) {
  return <div className="card"><h3>{title}</h3>{empty ? <p className="muted small">Nothing here.</p> : children}</div>;
}

export default async function WeeklyReviewPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const { supabase, tz, prefs } = await getCtx();
  const wso = prefs?.week_starts_on ?? 1;
  const base = /^\d{4}-\d{2}-\d{2}$/.test(sp.week ?? "") ? sp.week! : todayStr(tz);
  const ws = weekStartOf(base, wso), we = addDays(ws, 6);
  const start = localToUtc(ws, tz).toISOString(), end = localToUtc(addDays(ws, 7), tz).toISOString(), after = localToUtc(addDays(ws, 14), tz).toISOString();
  const nowIso = new Date().toISOString(), soon = localToUtc(addDays(todayStr(tz), 15), tz).toISOString();
  const [saved, history, completed, unfinished, overdue, meetings, deadlines, projects, converted, progress] = await Promise.all([
    supabase.from("weekly_reviews").select("*").eq("week_start", ws).maybeSingle(),
    supabase.from("weekly_reviews").select("week_start,week_end").order("week_start", { ascending: false }).limit(20),
    supabase.from("tasks").select("id,title,completed_at").eq("status", "done").gte("completed_at", start).lt("completed_at", end).order("completed_at"),
    supabase.from("tasks").select("id,title,due_at,status").in("status", ["todo", "in_progress", "waiting"]).is("archived_at", null).or(`and(due_at.gte.${start},due_at.lt.${end}),and(scheduled_at.gte.${start},scheduled_at.lt.${end})`).order("due_at"),
    supabase.from("tasks").select("id,title,due_at,status,archived_at").lt("due_at", nowIso).in("status", ["todo", "in_progress", "waiting"]).is("archived_at", null).order("due_at"),
    supabase.from("events").select("id,title,start_at").eq("status", "upcoming").gte("start_at", end).lt("start_at", after).order("start_at"),
    supabase.from("tasks").select("id,title,due_at").in("status", ["todo", "in_progress", "waiting"]).is("archived_at", null).gte("due_at", nowIso).lt("due_at", soon).order("due_at"),
    supabase.from("projects").select("id,name").eq("status", "active"),
    supabase.from("ideas").select("id,title").or("converted_task_id.not.is.null,converted_project_id.not.is.null").gte("updated_at", start).lt("updated_at", end),
    supabase.from("project_progress").select("project_id,pct"),
  ]);
  const pctOf = new Map((progress.data ?? []).map((r) => [r.project_id, r.pct ?? 0]));
  const od = (overdue.data ?? []).filter((t) => isOverdue(t));
  return (
    <>
      <PageHeader title="Weekly review" subtitle={`${formatDateOnly(ws)} – ${formatDateOnly(we)}`} actions={<><Link className="btn secondary sm" href={`/reviews/weekly?week=${addDays(ws, -7)}`}>← Previous week</Link><Link className="btn secondary sm" href={`/reviews/weekly?week=${addDays(ws, 7)}`}>Next week →</Link><Link className="btn secondary sm" href="/reviews">Reviews</Link></>} />
      <div className="grid cols-2">
        <S title={`Completed this week (${completed.data?.length ?? 0})`} empty={!completed.data?.length}><ul className="list">{completed.data?.map((t) => <li key={t.id}><Link className="plain" href={`/tasks/${t.id}`}>{t.title}</Link></li>)}</ul></S>
        <S title={`Unfinished from this week (${unfinished.data?.length ?? 0})`} empty={!unfinished.data?.length}><ul className="list">{unfinished.data?.map((t) => <li key={t.id}><Link className="plain" href={`/tasks/${t.id}`}>{t.title}</Link>{t.due_at && <span className="small muted">{formatDateTime(t.due_at, tz)}</span>}</li>)}</ul></S>
        <S title={`Overdue now (${od.length})`} empty={!od.length}><ul className="list">{od.map((t) => <li key={t.id}><Link className="plain" href={`/tasks/${t.id}`}>{t.title}</Link><span className="badge overdue">Overdue · {formatDateTime(t.due_at, tz)}</span></li>)}</ul></S>
        <S title="Upcoming meetings (next week)" empty={!meetings.data?.length}><ul className="list">{meetings.data?.map((m) => <li key={m.id}><span><Dot kind="meeting" /><Link className="plain" href={`/meetings/${m.id}`}>{m.title}</Link></span><span className="small muted">{formatDateTime(m.start_at, tz)}</span></li>)}</ul></S>
        <S title="Deadlines in the next 14 days" empty={!deadlines.data?.length}><ul className="list">{deadlines.data?.map((t) => <li key={t.id}><Link className="plain" href={`/tasks/${t.id}`}>{t.title}</Link><span className="small muted">{formatDateTime(t.due_at, tz)}</span></li>)}</ul></S>
        <S title="Active projects" empty={!projects.data?.length}><ul className="list">{projects.data?.map((p) => { const pct = pctOf.get(p.id) ?? 0; return <li key={p.id} style={{ display: "block" }}><Link className="plain" href={`/projects/${p.id}`}>{p.name}</Link><Progress pct={pct} /></li>; })}</ul></S>
        <S title="Ideas turned into action this week" empty={!converted.data?.length}><ul className="list">{converted.data?.map((i) => <li key={i.id}><Link className="plain" href={`/brainstorm/${i.id}`}>{i.title}</Link></li>)}</ul></S>
      </div>
      <div className="card">
        <h2><Dot kind="review" />Reflection and next week</h2>
        <ActionForm action={saveWeeklyReview} submitLabel="Save weekly review" key={saved.data?.updated_at ?? "new"}>
          <input type="hidden" name="week_start" value={ws} />
          <div className="stack">
            <Field label="Priorities for next week"><textarea name="next_week_priorities" defaultValue={saved.data?.next_week_priorities ?? ""} /></Field>
            <Field label="Personal reflection"><textarea name="reflection" defaultValue={saved.data?.reflection ?? ""} /></Field>
            <Field label="Lessons learned"><textarea name="lessons_learned" defaultValue={saved.data?.lessons_learned ?? ""} /></Field>
          </div>
        </ActionForm>
      </div>
      <div className="card"><h3>History</h3>{(history.data ?? []).length === 0 ? <p className="muted small">No saved weekly reviews yet.</p> : <ul className="list">{history.data!.map((h) => <li key={h.week_start}><Link className="plain" href={`/reviews/weekly?week=${h.week_start}`}>{formatDateOnly(h.week_start)} – {formatDateOnly(h.week_end)}</Link></li>)}</ul>}</div>
    </>
  );
}
