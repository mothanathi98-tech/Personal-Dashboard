"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays, weekStartOf } from "@/lib/dates";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";
import { firstIssue, formObject, optDate, optText, optUuid, reqText } from "@/lib/validation/common";

const refresh = () => revalidatePath("/", "layout");
const uid = z.string().uuid();
const STATUS = z.enum(["upcoming", "in_progress", "completed", "cancelled"]);

export async function saveReview(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({ id: optUuid, title: reqText(300), description: optText(), category_id: optUuid, project_id: optUuid, review_date: optDate, status: STATUS.default("upcoming"), notes: optText() }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { id, ...v } = p.data;
  try {
    const r = id ? await supabase.from("reviews").update(v).eq("id", id) : await supabase.from("reviews").insert({ ...v, user_id: user.id });
    if (r.error) throw r.error;
  } catch (e) { return fail(safeError(e)); }
  refresh(); return ok({ message: id ? "Review saved." : "Review created." });
}

export async function setReviewStatus(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id")); const st = STATUS.safeParse(fd.get("status"));
  if (!id.success || !st.success) return fail("Invalid request.");
  const { error } = await supabase.from("reviews").update({ status: st.data }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: st.data === "completed" ? "Review completed." : "Review updated." });
}

export async function deleteReview(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid review.");
  const { error } = await supabase.from("reviews").delete().eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Review deleted.", href: "/reviews" });
}

export async function addReviewTask(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({ review_id: uid, task_id: uid }).safeParse({ review_id: fd.get("review_id"), task_id: fd.get("task_id") });
  if (!p.success) return fail("Choose a task to link.");
  const { error } = await supabase.from("review_tasks").insert({ ...p.data, user_id: user.id });
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Linked." });
}

export async function removeReviewTask(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const p = z.object({ review_id: uid, task_id: uid }).safeParse({ review_id: fd.get("review_id"), task_id: fd.get("task_id") });
  if (!p.success) return fail("Invalid link.");
  const { error } = await supabase.from("review_tasks").delete().eq("review_id", p.data.review_id).eq("task_id", p.data.task_id);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Unlinked." });
}

/** Save (create or update) the weekly review for a week. One row per user+week is enforced by the database. */
export async function saveWeeklyReview(fd: FormData): Promise<Result> {
  const { supabase, user, prefs } = await getCtx();
  const p = z.object({ week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reflection: optText(), lessons_learned: optText(), next_week_priorities: optText() }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const week_start = weekStartOf(p.data.week_start, prefs?.week_starts_on ?? 1);
  const { error } = await supabase.from("weekly_reviews").upsert({ ...p.data, week_start, week_end: addDays(week_start, 6), user_id: user.id }, { onConflict: "user_id,week_start" });
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Weekly review saved." });
}
