"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";
import { firstIssue, formObject, localDateTime, optInt, optText, optUuid, parseTags, reqText } from "@/lib/validation/common";
import { syncTags } from "@/lib/tags";

const STATUS = z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]);
const PRIORITY = z.enum(["low", "medium", "high", "urgent"]);
const RULE = z.preprocess((v) => (v === "" || v == null ? null : v), z.enum(["daily", "weekly", "monthly", "weekdays"]).nullable());

const refresh = () => revalidatePath("/", "layout");

export async function saveTask(fd: FormData): Promise<Result> {
  const { supabase, user, tz } = await getCtx();
  const raw = formObject(fd);
  const wd = fd.getAll("recurrence_weekdays").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const parsed = z.object({
    id: optUuid, title: reqText(300), description: optText(), category_id: optUuid, project_id: optUuid, parent_task_id: optUuid,
    status: STATUS.default("todo"), priority: PRIORITY.default("medium"),
    due_at: localDateTime(tz), scheduled_at: localDateTime(tz), remind_at: localDateTime(tz),
    estimated_minutes: optInt, recurrence_rule: RULE,
  }).safeParse(raw);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const { id, ...v } = parsed.data;
  if (v.recurrence_rule && !v.due_at && !v.scheduled_at) return fail("Recurring tasks need a due or scheduled date.");
  if (v.recurrence_rule === "weekdays" && wd.length === 0) return fail("Pick at least one weekday.");
  if (id && v.parent_task_id === id) return fail("A task cannot be its own parent.");
  const row = { ...v, recurrence_weekdays: v.recurrence_rule === "weekdays" ? wd : null };
  const tags = parseTags(fd.get("tags"));
  try {
    let taskId = id;
    if (id) {
      const { data: before, error: e0 } = await supabase.from("tasks").select("status").eq("id", id).single();
      if (e0) throw e0;
      const wantsDone = row.status === "done" && before.status !== "done";
      const { error } = await supabase.from("tasks").update({ ...row, status: wantsDone ? before.status : row.status }).eq("id", id);
      if (error) throw error;
      if (wantsDone) { const r = await supabase.rpc("complete_task", { p_task_id: id }); if (r.error) throw r.error; }
    } else {
      const { data, error } = await supabase.from("tasks").insert({ ...row, user_id: user.id }).select("id").single();
      if (error) throw error;
      taskId = data.id;
    }
    await syncTags(supabase, user.id, "task", taskId!, tags);
  } catch (e) { return fail(safeError(e)); }
  refresh();
  return ok({ message: id ? "Task saved." : "Task created." });
}

async function simple(fn: (s: Awaited<ReturnType<typeof getCtx>>["supabase"]) => PromiseLike<{ error: { message: string } | null }>, message: string): Promise<Result> {
  const { supabase } = await getCtx();
  try { const { error } = await fn(supabase); if (error) throw error; } catch (e) { return fail(safeError(e)); }
  refresh();
  return ok({ message });
}

const idOf = (fd: FormData) => z.string().uuid().safeParse(fd.get("id"));

export async function completeTask(fd: FormData): Promise<Result> {
  const id = idOf(fd); if (!id.success) return fail("Invalid task.");
  return simple((s) => s.rpc("complete_task", { p_task_id: id.data }), "Task completed.");
}
export async function reopenTask(fd: FormData): Promise<Result> {
  const id = idOf(fd); if (!id.success) return fail("Invalid task.");
  return simple((s) => s.rpc("reopen_task", { p_task_id: id.data }), "Task reopened.");
}
export async function deleteTask(fd: FormData): Promise<Result> {
  const id = idOf(fd); if (!id.success) return fail("Invalid task.");
  const r = await simple((s) => s.from("tasks").delete().eq("id", id.data), "Task deleted.");
  return r.ok ? { ...r, href: fd.get("redirect") === "1" ? "/tasks" : undefined } : r;
}
export async function archiveTask(fd: FormData): Promise<Result> {
  const id = idOf(fd); if (!id.success) return fail("Invalid task.");
  const unarchive = fd.get("unarchive") === "1";
  return simple((s) => s.from("tasks").update({ archived_at: unarchive ? null : new Date().toISOString() }).eq("id", id.data), unarchive ? "Task restored." : "Task archived.");
}
export async function setTaskStatus(fd: FormData): Promise<Result> {
  const id = idOf(fd); const st = STATUS.safeParse(fd.get("status"));
  if (!id.success || !st.success) return fail("Invalid request.");
  if (st.data === "done") return simple((s) => s.rpc("complete_task", { p_task_id: id.data }), "Task completed.");
  return simple((s) => s.from("tasks").update({ status: st.data }).eq("id", id.data), "Status updated.");
}

/** Bulk: complete or archive selected tasks. Reports how many succeeded. */
export async function bulkTasks(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const ids = fd.getAll("ids").map(String).filter((x) => z.string().uuid().safeParse(x).success);
  const op = fd.get("op");
  if (!ids.length) return fail("Select at least one task.");
  if (op !== "complete" && op !== "archive") return fail("Invalid action.");
  let done = 0, failed = 0;
  for (const id of ids) {
    const r = op === "complete" ? await supabase.rpc("complete_task", { p_task_id: id }) : await supabase.from("tasks").update({ archived_at: new Date().toISOString() }).eq("id", id);
    if (r.error) failed++; else done++;
  }
  refresh();
  return failed ? fail(`${done} updated, ${failed} failed.`) : ok({ message: `${done} task${done === 1 ? "" : "s"} ${op === "complete" ? "completed" : "archived"}.` });
}

/** Manual ordering: swap with neighbour among active top-level tasks (normalises positions first). */
export async function moveTask(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const id = idOf(fd); const dir = fd.get("dir");
  if (!id.success || (dir !== "up" && dir !== "down")) return fail("Invalid request.");
  const { data, error } = await supabase.from("tasks").select("id,position").is("archived_at", null).order("position").order("created_at");
  if (error) return fail(safeError(error));
  const list = data ?? [];
  const i = list.findIndex((t) => t.id === id.data);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return ok();
  [list[i], list[j]] = [list[j], list[i]];
  for (let k = 0; k < list.length; k++) {
    if (list[k].position !== k * 10) {
      const r = await supabase.from("tasks").update({ position: k * 10 }).eq("id", list[k].id);
      if (r.error) return fail(safeError(r.error));
    }
  }
  refresh();
  return ok();
}
