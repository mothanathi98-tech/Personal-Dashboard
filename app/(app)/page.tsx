import Link from "next/link";
import { QuickAddButton } from "@/components/QuickAdd";
import { Dot, Progress } from "@/components/ui";
import { addDays, formatDateOnly, formatDateTime, localToUtc, todayStr } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import TaskRow from "@/features/tasks/TaskRow";

const TASK_COLS = "id,title,status,priority,due_at,scheduled_at,archived_at,recurrence_rule,category_id,parent_task_id";
const ACTIVE = ["todo", "in_progress", "waiting"];

export default async function Home() {
  const { supabase, profile, tz, categories } = await getCtx();
  const now = new Date();
  const today = todayStr(tz, now);
  const dayStart = localToUtc(today, tz).toISOString(), dayEnd = localToUtc(addDays(today, 1), tz).toISOString(), weekEnd = localToUtc(addDays(today, 8), tz).toISOString();
  const nowIso = now.toISOString();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const color = (id: string | null) => categories.find((c) => c.id === id)?.color;

  const [priorities, scheduled, overdue, deadlines, meetings, reviews, prepLinks, projects, progress, notes, ideas, doneToday, dueTodayOpen, counts] = await Promise.all([
    supabase.from("tasks").select(TASK_COLS).in("status", ACTIVE).is("archived_at", null).in("priority", ["urgent", "high"]).or(`due_at.lt.${dayEnd},and(scheduled_at.gte.${dayStart},scheduled_at.lt.${dayEnd})`).order("due_at", { nullsFirst: false }).limit(8),
    supabase.from("tasks").select(TASK_COLS).in("status", ACTIVE).is("archived_at", null).gte("scheduled_at", dayStart).lt("scheduled_at", dayEnd).order("scheduled_at").limit(10),
    supabase.from("tasks").select(TASK_COLS).in("status", ACTIVE).is("archived_at", null).lt("due_at", nowIso).order("due_at").limit(10),
    supabase.from("tasks").select(TASK_COLS).in("status", ACTIVE).is("archived_at", null).gte("due_at", nowIso).lt("due_at", weekEnd).order("due_at").limit(10),
    supabase.from("events").select("id,title,start_at,location").eq("status", "upcoming").gte("start_at", nowIso).order("start_at").limit(5),
    supabase.from("reviews").select("id,title,review_date,status").in("status", ["upcoming", "in_progress"]).or(`review_date.is.null,review_date.lte.${addDays(today, 7)}`).order("review_date", { nullsFirst: false }).limit(6),
    supabase.from("task_events").select(`relation, tasks!inner(${TASK_COLS}), events!inner(id,title,start_at,status)`).eq("relation", "preparation").limit(20),
    supabase.from("projects").select("id,name,color,category_id").eq("status", "active").order("updated_at", { ascending: false }).limit(6),
    supabase.from("project_progress").select("project_id,pct,basis"),
    supabase.from("notes").select("id,title,updated_at").is("archived_at", null).order("updated_at", { ascending: false }).limit(5),
    supabase.from("ideas").select("id,title,category_id,created_at").is("archived_at", null).order("created_at", { ascending: false }).limit(5),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "done").gte("completed_at", dayStart).lt("completed_at", dayEnd),
    supabase.from("tasks").select("id", { count: "exact", head: true }).in("status", ACTIVE).is("archived_at", null).or(`and(due_at.gte.${dayStart},due_at.lt.${dayEnd}),and(scheduled_at.gte.${dayStart},scheduled_at.lt.${dayEnd})`),
    supabase.from("tasks").select("id", { count: "exact", head: true }),
  ]);
  const prep = ((prepLinks.data ?? []) as unknown as { tasks: Parameters<typeof TaskRow>[0]["t"]; events: { id: string; title: string; start_at: string; status: string } }[]).filter((l) => l.events.status === "upcoming" && !["done", "cancelled"].includes(l.tasks.status) && !l.tasks.archived_at);
  const pmap = new Map((progress.data ?? []).map((p) => [p.project_id, p]));
  const doneN = doneToday.count ?? 0, openN = dueTodayOpen.count ?? 0, totalToday = doneN + openN;
  const pct = totalToday ? Math.round((doneN / totalToday) * 100) : 0;
  const taskList = (rows: Parameters<typeof TaskRow>[0]["t"][] | null) => <ul className="list">{(rows ?? []).map((t) => <TaskRow key={t.id} t={t} tz={tz} color={color(t.category_id)} />)}</ul>;
  const empty = (counts.count ?? 0) === 0;

  return (
    <>
      <div className="page-head">
        <div><h1>{greeting}{profile?.display_name ? `, ${profile.display_name}` : ""}</h1><p className="muted" style={{ margin: 0 }}>{formatDateOnly(today)} · {tz}</p></div>
        <div className="row">{["task", "idea", "note", "meeting", "review", "project"].map((t) => <QuickAddButton key={t} type={t} className="btn secondary sm">+ {t[0].toUpperCase() + t.slice(1)}</QuickAddButton>)}</div>
      </div>
      {empty && <div className="card"><h2>Start here</h2><p className="muted">Nothing captured yet. Use quick-add (＋) to add your first task, idea or meeting. Your dashboard fills in from real records as you go.</p></div>}
      <div className="grid cols-2">
        <section className="card" aria-labelledby="h-prio"><h2 id="h-prio">Today&apos;s priorities</h2>{(priorities.data ?? []).length === 0 ? <p className="muted">No high-priority tasks due or scheduled today.</p> : taskList(priorities.data)}</section>
        <section className="card" aria-labelledby="h-prog"><h2 id="h-prog">Today&apos;s progress</h2>
          {totalToday === 0 ? <p className="muted">Nothing due or scheduled today yet.</p> : <><Progress pct={pct} /><p className="small muted">{doneN} done · {openN} still to do today ({pct}%)</p></>}
        </section>
        <section className="card" aria-labelledby="h-sched"><h2 id="h-sched">Scheduled for today</h2>{(scheduled.data ?? []).length === 0 ? <p className="muted">No work scheduled for today.</p> : taskList(scheduled.data)}</section>
        <section className="card" aria-labelledby="h-over"><h2 id="h-over">Overdue</h2>{(overdue.data ?? []).length === 0 ? <p className="muted">Nothing overdue.</p> : taskList(overdue.data)}</section>
        <section className="card" aria-labelledby="h-dead"><h2 id="h-dead">Upcoming deadlines (7 days)</h2>{(deadlines.data ?? []).length === 0 ? <p className="muted">No deadlines in the next 7 days.</p> : taskList(deadlines.data)}</section>
        <section className="card" aria-labelledby="h-meet"><h2 id="h-meet">Upcoming meetings</h2>
          {(meetings.data ?? []).length === 0 ? <p className="muted">No upcoming meetings.</p> : <ul className="list">{meetings.data!.map((m) => <li key={m.id}><span><Dot kind="meeting" /><Link className="plain" href={`/meetings/${m.id}`}>{m.title}</Link></span><span className="small muted">{formatDateTime(m.start_at, tz)}</span></li>)}</ul>}
        </section>
        <section className="card" aria-labelledby="h-rev"><h2 id="h-rev">Reviews and preparation</h2>
          {(reviews.data ?? []).length === 0 && prep.length === 0 ? <p className="muted">No reviews or preparation items pending.</p> : <ul className="list">
            {reviews.data!.map((r) => <li key={r.id}><span><Dot kind="review" /><Link className="plain" href={`/reviews/${r.id}`}>{r.title}</Link></span><span className="small muted">{r.review_date ? formatDateOnly(r.review_date) : "No date"}</span></li>)}
            {prep.map((l) => <li key={l.tasks.id}><span><Dot kind="review" /><Link className="plain" href={`/tasks/${l.tasks.id}`}>{l.tasks.title}</Link></span><span className="small muted">prep for {l.events.title}</span></li>)}
          </ul>}
        </section>
        <section className="card" aria-labelledby="h-proj"><h2 id="h-proj">Active projects</h2>
          {(projects.data ?? []).length === 0 ? <p className="muted">No active projects.</p> : <ul className="list">{projects.data!.map((p) => <li key={p.id} style={{ display: "block" }}><div className="row between"><span><Dot color={p.color ?? color(p.category_id)} /><Link className="plain" href={`/projects/${p.id}`}>{p.name}</Link></span><span className="small muted">{pmap.get(p.id)?.pct ?? 0}%</span></div><Progress pct={pmap.get(p.id)?.pct ?? 0} /></li>)}</ul>}
        </section>
        <section className="card" aria-labelledby="h-notes"><h2 id="h-notes">Recently edited notes</h2>
          {(notes.data ?? []).length === 0 ? <p className="muted">No notes yet.</p> : <ul className="list">{notes.data!.map((n) => <li key={n.id}><Link className="plain" href={`/notes/${n.id}`}>{n.title}</Link><span className="small muted">{formatDateTime(n.updated_at, tz)}</span></li>)}</ul>}
        </section>
        <section className="card" aria-labelledby="h-ideas"><h2 id="h-ideas">Recently captured ideas</h2>
          {(ideas.data ?? []).length === 0 ? <p className="muted">No ideas yet.</p> : <ul className="list">{ideas.data!.map((i) => <li key={i.id}><span><Dot color={color(i.category_id)} /><Link className="plain" href={`/brainstorm/${i.id}`}>{i.title}</Link></span></li>)}</ul>}
        </section>
      </div>
    </>
  );
}
