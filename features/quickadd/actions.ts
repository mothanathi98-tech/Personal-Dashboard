"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";
import { firstIssue, formObject, localDateTime, optDate, optText, optUuid, reqText } from "@/lib/validation/common";

/** Fast capture. Only a title is required (plus a start time for meetings); everything else can be filled in later. */
export async function quickAdd(fd: FormData): Promise<Result> {
  const { supabase, user, tz } = await getCtx();
  const p = z.object({
    type: z.enum(["task", "project", "idea", "note", "meeting", "review"]), title: reqText(300), category_id: optUuid,
    when: localDateTime(tz), date: optDate, details: optText(),
  }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { type, title, category_id, when, date, details } = p.data;
  try {
    let r;
    if (type === "task") r = await supabase.from("tasks").insert({ user_id: user.id, title, category_id, due_at: when, description: details });
    else if (type === "project") r = await supabase.from("projects").insert({ user_id: user.id, name: title, category_id, description: details });
    else if (type === "idea") r = await supabase.from("ideas").insert({ user_id: user.id, title, category_id, content: details });
    else if (type === "note") r = await supabase.from("notes").insert({ user_id: user.id, title, category_id, content: details ?? "" });
    else if (type === "meeting") { if (!when) return fail("Meetings need a start date and time."); r = await supabase.from("events").insert({ user_id: user.id, title, category_id, start_at: when, description: details }); }
    else r = await supabase.from("reviews").insert({ user_id: user.id, title, category_id, review_date: date, description: details });
    if (r.error) throw r.error;
  } catch (e) { return fail(safeError(e)); }
  revalidatePath("/", "layout");
  return ok({ message: `${type[0].toUpperCase()}${type.slice(1)} added.` });
}
