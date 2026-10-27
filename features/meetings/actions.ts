"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";
import { firstIssue, formObject, localDateTime, optText, optUuid, reqText } from "@/lib/validation/common";

const refresh = () => revalidatePath("/", "layout");
const uid = z.string().uuid();

export async function saveEvent(fd: FormData): Promise<Result> {
  const { supabase, user, tz } = await getCtx();
  const p = z.object({
    id: optUuid, title: reqText(300), description: optText(), start_at: localDateTime(tz), end_at: localDateTime(tz), follow_up_at: localDateTime(tz),
    location: optText(300), meeting_url: z.preprocess((v) => (v === "" ? null : v), z.string().url().regex(/^https?:\/\//i, "Use an http(s) link").nullable()),
    category_id: optUuid, project_id: optUuid, status: z.enum(["upcoming", "completed", "cancelled"]).default("upcoming"), minutes: optText(), decisions: optText(),
  }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { id, ...v } = p.data;
  if (!v.start_at) return fail("Start date and time are required.");
  if (v.end_at && v.end_at < v.start_at) return fail("End must be after start.");
  const row = { ...v, start_at: v.start_at };
  try {
    if (id) { const r = await supabase.from("events").update(row).eq("id", id); if (r.error) throw r.error; }
    else { const r = await supabase.from("events").insert({ ...row, user_id: user.id }); if (r.error) throw r.error; }
  } catch (e) { return fail(safeError(e)); }
  refresh();
  return ok({ message: id ? "Meeting saved." : "Meeting created." });
}

export async function setEventStatus(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const id = uid.safeParse(fd.get("id")); const st = z.enum(["upcoming", "completed", "cancelled"]).safeParse(fd.get("status"));
  if (!id.success || !st.success) return fail("Invalid request.");
  const { error } = await supabase.from("events").update({ status: st.data }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: st.data === "cancelled" ? "Meeting cancelled; pending reminders removed." : "Meeting updated." });
}

export async function deleteEvent(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid meeting.");
  const { error } = await supabase.from("events").delete().eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Meeting deleted.", href: "/meetings" });
}

export async function addAgendaItem(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({ event_id: uid, title: reqText(300), description: optText(2000) }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { data: last } = await supabase.from("event_agenda_items").select("position").eq("event_id", p.data.event_id).order("position", { ascending: false }).limit(1);
  const { error } = await supabase.from("event_agenda_items").insert({ ...p.data, user_id: user.id, position: (last?.[0]?.position ?? -1) + 1 });
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Agenda item added." });
}

export async function toggleAgendaItem(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid item.");
  const { error } = await supabase.from("event_agenda_items").update({ is_completed: fd.get("done") === "1" }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok();
}

export async function deleteAgendaItem(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid item.");
  const { error } = await supabase.from("event_agenda_items").delete().eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok();
}

export async function moveAgendaItem(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const id = uid.safeParse(fd.get("id")); const ev = uid.safeParse(fd.get("event_id")); const dir = fd.get("dir");
  if (!id.success || !ev.success || (dir !== "up" && dir !== "down")) return fail("Invalid request.");
  const { data } = await supabase.from("event_agenda_items").select("id,position").eq("event_id", ev.data).order("position").order("created_at");
  const list = data ?? []; const i = list.findIndex((x) => x.id === id.data); const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return ok();
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) if (list[k].position !== k) { const r = await supabase.from("event_agenda_items").update({ position: k }).eq("id", list[k].id); if (r.error) return fail(safeError(r.error)); }
  refresh(); return ok();
}

/** Create a preparation or follow-up task and link it to the meeting (validated composite FKs). */
export async function addEventTask(fd: FormData): Promise<Result> {
  const { supabase, user, tz } = await getCtx();
  const p = z.object({ event_id: uid, relation: z.enum(["preparation", "follow_up"]), title: reqText(300), due_at: localDateTime(tz) }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { data: ev } = await supabase.from("events").select("category_id,project_id").eq("id", p.data.event_id).single();
  const t = await supabase.from("tasks").insert({ user_id: user.id, title: p.data.title, due_at: p.data.due_at, category_id: ev?.category_id ?? null, project_id: ev?.project_id ?? null }).select("id").single();
  if (t.error) return fail(safeError(t.error));
  const l = await supabase.from("task_events").insert({ user_id: user.id, task_id: t.data.id, event_id: p.data.event_id, relation: p.data.relation });
  if (l.error) return fail(safeError(l.error));
  refresh(); return ok({ message: p.data.relation === "follow_up" ? "Follow-up task added." : "Preparation task added." });
}
