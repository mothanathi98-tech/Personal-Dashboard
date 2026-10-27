"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";
import { firstIssue, formObject, hexColor, optText, optUuid, parseTags, reqText } from "@/lib/validation/common";
import { syncTags } from "@/lib/tags";

const refresh = () => revalidatePath("/", "layout");
const STATUS = z.enum(["raw_idea", "exploring", "validating", "ready_to_build", "in_progress", "implemented", "archived"]);
const uid = z.string().uuid();

export async function saveIdea(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({ id: optUuid, title: reqText(300), content: optText(), category_id: optUuid, project_id: optUuid, status: STATUS.default("raw_idea"), color: hexColor }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { id, ...v } = p.data;
  const colorOverride = fd.get("use_color") === "1" ? v.color : null;
  const row = { ...v, color: colorOverride, archived_at: v.status === "archived" ? new Date().toISOString() : null };
  try {
    let rid = id;
    if (id) { const r = await supabase.from("ideas").update(row).eq("id", id); if (r.error) throw r.error; }
    else { const r = await supabase.from("ideas").insert({ ...row, user_id: user.id }).select("id").single(); if (r.error) throw r.error; rid = r.data.id; }
    await syncTags(supabase, user.id, "idea", rid!, parseTags(fd.get("tags")));
  } catch (e) { return fail(safeError(e)); }
  refresh();
  return ok({ message: id ? "Idea saved." : "Idea captured." });
}

export async function toggleIdeaPin(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid idea.");
  const { error } = await supabase.from("ideas").update({ is_pinned: fd.get("pin") === "1" }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok();
}

export async function archiveIdea(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid idea.");
  const restore = fd.get("restore") === "1";
  const { error } = await supabase.from("ideas").update(restore ? { archived_at: null, status: "raw_idea" } : { archived_at: new Date().toISOString(), status: "archived" }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: restore ? "Idea restored." : "Idea archived." });
}

export async function deleteIdea(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid idea.");
  // Tasks/projects created from the idea are kept.
  const { error } = await supabase.from("ideas").delete().eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Idea deleted.", href: "/brainstorm" });
}

/** Convert an idea to a task or project in one database transaction. Original idea is kept; repeat calls return the existing record. */
export async function convertIdea(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id")); const to = fd.get("to");
  if (!id.success || (to !== "task" && to !== "project")) return fail("Invalid request.");
  const r = to === "task" ? await supabase.rpc("convert_idea_to_task", { p_idea_id: id.data }) : await supabase.rpc("convert_idea_to_project", { p_idea_id: id.data });
  if (r.error || !r.data) return fail(safeError(r.error));
  refresh();
  return ok({ message: `Converted to ${to}.`, href: to === "task" ? `/tasks/${r.data}` : `/projects/${r.data}` });
}
