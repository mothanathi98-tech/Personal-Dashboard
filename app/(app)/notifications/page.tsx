import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import { Empty, PageHeader, Tabs } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { dismissNotification, markAllRead, markRead } from "@/features/notifications/actions";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const sp = await searchParams;
  const s = ["unread", "all", "dismissed"].includes(sp.s ?? "") ? sp.s! : "unread";
  const { supabase, tz } = await getCtx();
  let q = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  if (s === "unread") q = q.is("read_at", null).is("dismissed_at", null); else if (s === "all") q = q.is("dismissed_at", null); else q = q.not("dismissed_at", "is", null);
  const [{ data, error }, { data: pending }] = await Promise.all([q, supabase.from("reminder_jobs").select("id,status").in("status", ["failed"]).limit(1)]);
  const href = (n: { task_id: string | null; event_id: string | null; review_id: string | null }) => n.task_id ? `/tasks/${n.task_id}` : n.event_id ? `/meetings/${n.event_id}` : n.review_id ? `/reviews/${n.review_id}` : null;
  return (
    <>
      <PageHeader title="Notifications" subtitle="Reminders appear here when they fire. History is kept." actions={<ActionForm action={markAllRead} inline><button className="btn secondary sm">Mark all read</button></ActionForm>} />
      <Tabs current={s} items={[{ key: "unread", label: "Unread", href: "/notifications?s=unread" }, { key: "all", label: "All", href: "/notifications?s=all" }, { key: "dismissed", label: "Dismissed", href: "/notifications?s=dismissed" }]} />
      {(pending ?? []).length > 0 && <p className="err" role="alert">⚠ Some reminder deliveries failed. Check Settings → Reminders.</p>}
      {error && <p className="err" role="alert">⚠ Could not load notifications.</p>}
      {!error && (data ?? []).length === 0 && <Empty title="Nothing here" hint="Reminders for dated tasks, meetings and reviews show up when they are due." />}
      {(data ?? []).length > 0 && <div className="card"><ul className="list">{data!.map((n) => {
        const h = href(n);
        return (
          <li key={n.id}>
            <div style={{ fontWeight: n.read_at ? 400 : 700 }}>{!n.read_at && <span aria-label="Unread">● </span>}{h ? <Link className="plain" href={h}>{n.title}</Link> : n.title}
              {n.body && <div className="small muted">{n.body}</div>}<div className="small muted">{formatDateTime(n.created_at, tz)}</div></div>
            <div className="row">
              <ActionForm action={markRead} inline><input type="hidden" name="id" value={n.id} />{n.read_at && <input type="hidden" name="unread" value="1" />}<button className="btn secondary sm">{n.read_at ? "Mark unread" : "Mark read"}</button></ActionForm>
              {!n.dismissed_at && <ActionForm action={dismissNotification} inline><input type="hidden" name="id" value={n.id} /><button className="btn secondary sm">Dismiss</button></ActionForm>}
            </div>
          </li>
        );
      })}</ul></div>}
    </>
  );
}
