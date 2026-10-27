import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Dot, Empty, PageHeader, Tabs, label } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { saveEvent } from "@/features/meetings/actions";
import EventFields from "@/features/meetings/EventFields";

export default async function MeetingsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sp = await searchParams;
  const s = ["upcoming", "past", "cancelled"].includes(sp.s ?? "") ? sp.s! : "upcoming";
  const { supabase, categories, tz } = await getCtx();
  const now = new Date().toISOString();
  let q = supabase.from("events").select("id,title,start_at,end_at,location,status,category_id").limit(200);
  q = s === "upcoming" ? q.eq("status", "upcoming").gte("start_at", now).order("start_at") : s === "past" ? q.neq("status", "cancelled").or(`status.eq.completed,start_at.lt.${now}`).order("start_at", { ascending: false }) : q.eq("status", "cancelled").order("start_at", { ascending: false });
  const [{ data: events, error }, { data: projects }] = await Promise.all([q, supabase.from("projects").select("id,name").is("archived_at", null).order("name")]);
  return (
    <>
      <PageHeader title="Meetings" subtitle="Agendas, preparation, minutes and decisions." />
      <details className="card" style={{ marginBottom: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>+ New meeting</summary>
        <div style={{ marginTop: 12 }}><ActionForm action={saveEvent} resetOnSuccess submitLabel="Create meeting"><EventFields categories={categories} projects={projects ?? []} tz={tz} /></ActionForm></div>
      </details>
      <Tabs current={s} items={[{ key: "upcoming", label: "Upcoming", href: "/meetings?s=upcoming" }, { key: "past", label: "Past", href: "/meetings?s=past" }, { key: "cancelled", label: "Cancelled", href: "/meetings?s=cancelled" }]} />
      {error && <p className="err" role="alert">⚠ Could not load meetings.</p>}
      {!error && (events ?? []).length === 0 && <Empty title={`No ${s} meetings`} />}
      {(events ?? []).length > 0 && <div className="card"><ul className="list">{events!.map((e) => (
        <li key={e.id}><div><Dot kind="meeting" /><Link className="plain" href={`/meetings/${e.id}`}>{e.title}</Link><div className="small muted">{formatDateTime(e.start_at, tz)}{e.location ? ` · ${e.location}` : ""}</div></div><span className="badge">{label(e.status)}</span></li>
      ))}</ul></div>}
    </>
  );
}
