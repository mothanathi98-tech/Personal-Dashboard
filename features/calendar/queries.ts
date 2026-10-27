import type { SupabaseClient } from "@supabase/supabase-js";
import { dateStrOf, isOverdue, localToUtc } from "@/lib/dates";
import type { Database } from "@/types/database";

export type CalItem = {
  key: string; kind: "deadline" | "work" | "meeting" | "review" | "followup"; id: string; title: string;
  date: string; time: string | null; done: boolean; overdue: boolean; categoryId: string | null; href: string;
};

/** All dated records in [fromDate, toDate) (date strings in the user's tz). Undated tasks are never returned. */
export async function loadCalendar(supabase: SupabaseClient<Database>, tz: string, fromDate: string, toDate: string, category?: string): Promise<CalItem[]> {
  const from = localToUtc(fromDate, tz).toISOString(), to = localToUtc(toDate, tz).toISOString();
  const tq = (col: "due_at" | "scheduled_at") => {
    let q = supabase.from("tasks").select("id,title,status,due_at,scheduled_at,category_id,archived_at").is("archived_at", null).gte(col, from).lt(col, to).limit(500);
    if (category) q = q.eq("category_id", category);
    return q;
  };
  let eq = supabase.from("events").select("id,title,status,start_at,follow_up_at,category_id").neq("status", "cancelled").gte("start_at", from).lt("start_at", to).limit(500);
  let fq = supabase.from("events").select("id,title,status,start_at,follow_up_at,category_id").neq("status", "cancelled").gte("follow_up_at", from).lt("follow_up_at", to).limit(200);
  let rq = supabase.from("reviews").select("id,title,status,review_date,category_id").neq("status", "cancelled").gte("review_date", fromDate).lt("review_date", toDate).limit(300);
  if (category) { eq = eq.eq("category_id", category); fq = fq.eq("category_id", category); rq = rq.eq("category_id", category); }
  const [due, sched, ev, fu, rv] = await Promise.all([tq("due_at"), tq("scheduled_at"), eq, fq, rq]);
  const hhmm = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  const items: CalItem[] = [];
  for (const t of due.data ?? []) items.push({ key: `d${t.id}`, kind: "deadline", id: t.id, title: t.title, date: dateStrOf(t.due_at!, tz), time: hhmm(t.due_at!), done: t.status === "done" || t.status === "cancelled", overdue: isOverdue(t), categoryId: t.category_id, href: `/tasks/${t.id}` });
  for (const t of sched.data ?? []) items.push({ key: `w${t.id}`, kind: "work", id: t.id, title: t.title, date: dateStrOf(t.scheduled_at!, tz), time: hhmm(t.scheduled_at!), done: t.status === "done" || t.status === "cancelled", overdue: false, categoryId: t.category_id, href: `/tasks/${t.id}` });
  for (const e of ev.data ?? []) items.push({ key: `m${e.id}`, kind: "meeting", id: e.id, title: e.title, date: dateStrOf(e.start_at, tz), time: hhmm(e.start_at), done: e.status === "completed", overdue: false, categoryId: e.category_id, href: `/meetings/${e.id}` });
  for (const e of fu.data ?? []) items.push({ key: `f${e.id}`, kind: "followup", id: e.id, title: `Follow-up: ${e.title}`, date: dateStrOf(e.follow_up_at!, tz), time: hhmm(e.follow_up_at!), done: false, overdue: false, categoryId: e.category_id, href: `/meetings/${e.id}` });
  for (const r of rv.data ?? []) items.push({ key: `r${r.id}`, kind: "review", id: r.id, title: r.title, date: r.review_date!, time: null, done: r.status === "completed", overdue: r.status !== "completed" && r.review_date! < dateStrOf(new Date(), tz), categoryId: r.category_id, href: `/reviews/${r.id}` });
  return items.sort((a, b) => (a.date + (a.time ?? "00:00")).localeCompare(b.date + (b.time ?? "00:00")));
}
