// Reminder worker. Invoked every minute by pg_cron (pg_net). Authenticated by a shared secret kept in
// Supabase Vault; recipients and records are derived from the database, never from the request.
import { createClient } from "npm:@supabase/supabase-js@2";
import { getProvider, SendError } from "./providers.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

type Job = { id: string; user_id: string; task_id: string | null; event_id: string | null; review_id: string | null; kind: string; channel: "in_app" | "email"; reminder_at: string };

const fmt = (iso: string, tz: string) => new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: tz, hourCycle: "h23" }).format(new Date(iso));

async function target(j: Job, tz: string): Promise<{ title: string; body: string } | null> {
  if (j.task_id) {
    const { data } = await admin.from("tasks").select("title,status,archived_at,due_at,scheduled_at").eq("id", j.task_id).eq("user_id", j.user_id).maybeSingle();
    if (!data || data.archived_at || !["todo", "in_progress", "waiting"].includes(data.status)) return null;
    const when = j.kind === "scheduled" ? data.scheduled_at : data.due_at;
    const verb = j.kind === "scheduled" ? "Scheduled" : j.kind === "custom" ? "Reminder" : "Due";
    return { title: `${verb}: ${data.title}`, body: when ? `${verb} ${fmt(when, tz)}` : "Reminder" };
  }
  if (j.event_id) {
    const { data } = await admin.from("events").select("title,status,start_at,follow_up_at").eq("id", j.event_id).eq("user_id", j.user_id).maybeSingle();
    if (!data || data.status !== "upcoming") return null;
    if (j.kind === "follow_up") return { title: `Follow up: ${data.title}`, body: "Meeting follow-up is due." };
    return { title: `Meeting: ${data.title}`, body: `Starts ${fmt(data.start_at, tz)}` };
  }
  if (j.review_id) {
    const { data } = await admin.from("reviews").select("title,status,review_date").eq("id", j.review_id).eq("user_id", j.user_id).maybeSingle();
    if (!data || !["upcoming", "in_progress"].includes(data.status)) return null;
    return { title: `Review: ${data.title}`, body: data.review_date ? `Review date ${data.review_date}` : "Review reminder" };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const { data: secret } = await admin.rpc("get_worker_secret");
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !safeEqual(String(secret), given)) return new Response("Unauthorized", { status: 401 });

  const provider = getProvider();
  const channels = provider ? ["in_app", "email"] : ["in_app"];
  const { data: jobs, error } = await admin.rpc("claim_reminder_jobs_for", { p_limit: 25, p_channels: channels });
  if (error) return new Response(JSON.stringify({ error: "claim failed" }), { status: 500 });

  const stats = { claimed: (jobs ?? []).length, sent: 0, retried: 0, failed: 0, obsolete: 0, email_configured: !!provider };
  for (const j of (jobs ?? []) as Job[]) {
    try {
      const { data: prof } = await admin.from("profiles").select("timezone").eq("id", j.user_id).maybeSingle();
      const tz = prof?.timezone ?? "Africa/Johannesburg";
      const t = await target(j, tz);
      if (!t) { await admin.from("reminder_jobs").update({ status: "cancelled" }).eq("id", j.id); stats.obsolete++; continue; }
      if (j.channel === "in_app") {
        const { error: e } = await admin.from("notifications").insert({ user_id: j.user_id, title: t.title, body: t.body, task_id: j.task_id, event_id: j.event_id, review_id: j.review_id, reminder_job_id: j.id });
        if (e && e.code !== "23505") throw new SendError("notification insert failed", true); // 23505 = already delivered (idempotent)
        await admin.rpc("finish_reminder_job", { p_id: j.id, p_ok: true, p_provider_id: "in-app" });
      } else {
        const { data: u } = await admin.auth.admin.getUserById(j.user_id);
        const to = u?.user?.email;
        if (!to || !provider) throw new SendError("no recipient or provider", false);
        const r = await provider.send({ to, subject: t.title, text: `${t.body}\n\n— Command Centre` });
        await admin.rpc("finish_reminder_job", { p_id: j.id, p_ok: true, p_provider_id: r.id });
      }
      stats.sent++;
    } catch (e) {
      const retry = e instanceof SendError ? e.retry : true;
      await admin.rpc("finish_reminder_job", { p_id: j.id, p_ok: false, p_error: e instanceof SendError ? e.message : "unexpected error", p_retry: retry });
      retry ? stats.retried++ : stats.failed++;
    }
  }
  return new Response(JSON.stringify(stats), { headers: { "Content-Type": "application/json" } });
});
