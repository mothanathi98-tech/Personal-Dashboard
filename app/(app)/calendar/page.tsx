import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import { addDays, addMonths, formatDateOnly, monthStartOf, todayStr, weekStartOf } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import CalItemLink from "@/features/calendar/CalItemLink";
import { loadCalendar, type CalItem } from "@/features/calendar/queries";

type SP = { view?: string; date?: string; category?: string };
const VIEWS = ["month", "week", "day", "agenda"] as const;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase, tz, categories, prefs } = await getCtx();
  const wso = prefs?.week_starts_on ?? 1;
  const view = (VIEWS as readonly string[]).includes(sp.view ?? "") ? sp.view! : "month";
  const today = todayStr(tz);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.date ?? "") ? sp.date! : today;

  let from: string, to: string, prev: string, next: string, title: string;
  if (view === "month") { const ms = monthStartOf(date); from = weekStartOf(ms, wso); to = addDays(from, 42); prev = addMonths(ms, -1); next = addMonths(ms, 1); title = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(ms + "T00:00:00Z")); }
  else if (view === "week") { from = weekStartOf(date, wso); to = addDays(from, 7); prev = addDays(from, -7); next = addDays(from, 7); title = `${formatDateOnly(from)} – ${formatDateOnly(addDays(from, 6))}`; }
  else if (view === "day") { from = date; to = addDays(date, 1); prev = addDays(date, -1); next = addDays(date, 1); title = formatDateOnly(date); }
  else { from = date; to = addDays(date, 30); prev = addDays(date, -30); next = addDays(date, 30); title = `Next 30 days from ${formatDateOnly(date)}`; }

  const items = await loadCalendar(supabase, tz, from, to, sp.category);
  const byDay = new Map<string, CalItem[]>();
  for (const it of items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);
  const color = (id: string | null) => categories.find((c) => c.id === id)?.color;
  const href = (o: Partial<SP>) => { const p = new URLSearchParams(); for (const [k, v] of Object.entries({ view, date, category: sp.category, ...o })) if (v) p.set(k, v); return `/calendar?${p}`; };
  const days = (n: number, start: string) => Array.from({ length: n }, (_, i) => addDays(start, i));
  const dayList = (d: string) => (byDay.get(d) ?? []).map((it) => <CalItemLink key={it.key} it={it} color={color(it.categoryId)} compact={view === "month"} />);
  const dayHead = (d: string) => new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"));
  const ms = monthStartOf(date);

  return (
    <>
      <PageHeader title="Calendar" subtitle={title} actions={<>
        <Link className="btn secondary sm" href={href({ date: prev })}>← Prev</Link><Link className="btn secondary sm" href={href({ date: today })}>Today</Link><Link className="btn secondary sm" href={href({ date: next })}>Next →</Link>
      </>} />
      <div className="row" style={{ marginBottom: 12 }}>
        <nav className="tabs" aria-label="Calendar views" style={{ margin: 0 }}>{VIEWS.map((v) => <Link key={v} href={href({ view: v })} aria-current={v === view ? "page" : undefined}>{v[0].toUpperCase() + v.slice(1)}</Link>)}</nav>
        <form method="get" className="row"><input type="hidden" name="view" value={view} /><input type="hidden" name="date" value={date} />
          <select name="category" defaultValue={sp.category ?? ""} aria-label="Filter by category" style={{ maxWidth: 170 }}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button className="btn secondary sm">Filter</button></form>
      </div>
      <p className="small muted">Red-edged = deadlines · green-edged = scheduled work · plain = meetings and reviews. Undated tasks are not shown.</p>
      {view === "month" && (
        <>
          <div className="cal-grid month" role="grid" aria-label="Month">
            {days(7, from).map((d) => <div key={d} className="small muted" role="columnheader">{new Intl.DateTimeFormat("en-ZA", { weekday: "short", timeZone: "UTC" }).format(new Date(d + "T00:00:00Z"))}</div>)}
            {days(42, from).map((d) => (
              <div key={d} className={`cal-cell ${d === today ? "today" : ""} ${d.slice(0, 7) !== ms.slice(0, 7) ? "dim" : ""}`}>
                <Link href={href({ view: "day", date: d })} className="plain small muted">{Number(d.slice(8))}</Link>{dayList(d)}
              </div>
            ))}
          </div>
          <div className="cal-month-list card">
            {days(42, from).filter((d) => d.slice(0, 7) === ms.slice(0, 7) && (byDay.get(d)?.length ?? 0) > 0).map((d) => <div key={d} style={{ marginBottom: 10 }}><strong><Link className="plain" href={href({ view: "day", date: d })}>{dayHead(d)}</Link></strong>{dayList(d)}</div>)}
            {items.length === 0 && <p className="muted">Nothing scheduled this month.</p>}
          </div>
        </>
      )}
      {view === "week" && <div className="grid cols-3">{days(7, from).map((d) => <div key={d} className={`card ${d === today ? "today" : ""}`} style={d === today ? { borderColor: "var(--green)", marginTop: 0 } : { marginTop: 0 }}><h3><Link className="plain" href={href({ view: "day", date: d })}>{dayHead(d)}</Link></h3>{(byDay.get(d) ?? []).length === 0 ? <p className="muted small">Free</p> : dayList(d)}</div>)}</div>}
      {view === "day" && <div className="card">{items.length === 0 ? <Empty title="Nothing scheduled" hint="Dated tasks, meetings and reviews appear here." /> : dayList(date)}</div>}
      {view === "agenda" && (items.length === 0 ? <Empty title="Nothing in this range" /> : <div className="card">{Array.from(byDay.keys()).sort().map((d) => <div key={d} style={{ marginBottom: 12 }}><strong>{dayHead(d)}{d === today ? " · Today" : ""}</strong>{dayList(d)}</div>)}</div>)}
    </>
  );
}
