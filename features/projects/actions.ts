"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";
import { firstIssue, formObject, hexColor, optDate, optText, optUuid, reqText } from "@/lib/validation/common";

const refresh = () => revalidatePath("/", "layout");
const STATUS = z.enum(["planning", "active", "on_hold", "completed", "archived"]);

export async function saveProject(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({
    id: optUuid, name: reqText(200), description: optText(), category_id: optUuid, status: STATUS.default("planning"),
    start_date: optDate, target_date: optDate, color: hexColor,
  }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { id, ...v } = p.data;
  if (v.start_date && v.target_date && v.target_date < v.start_date) return fail("Target date must be on or after the start date.");
  const row = { ...v, archived_at: v.status === "archived" ? new Date().toISOString() : null };
  try {
    const r = id ? await supabase.from("projects").update(row).eq("id", id) : await supabase.from("projects").insert({ ...row, user_id: user.id });
    if (r.error) throw r.error;
  } catch (e) { return fail(safeError(e)); }
  refresh();
  return ok({ message: id ? "Project saved." : "Project created." });
}

export async function deleteProject(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid project.");
  // Linked tasks/notes/ideas are kept (their project link is cleared by the database); milestones are removed with the project.
  const { error } = await supabase.from("projects").delete().eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh();
  return ok({ message: "Project deleted.", href: "/projects" });
}

export async function saveMilestone(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({
    id: optUuid, project_id: z.string().uuid(), title: reqText(200), description: optText(), due_date: optDate,
    weight: z.preprocess((v) => (v === "" || v == null ? 1 : Number(v)), z.number().positive().max(1000)),
  }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { id, ...v } = p.data;
  try {
    if (id) { const r = await supabase.from("project_milestones").update(v).eq("id", id); if (r.error) throw r.error; }
    else {
      const { data: last } = await supabase.from("project_milestones").select("position").eq("project_id", v.project_id).order("position", { ascending: false }).limit(1);
      const r = await supabase.from("project_milestones").insert({ ...v, user_id: user.id, position: (last?.[0]?.position ?? -1) + 1 });
      if (r.error) throw r.error;
    }
  } catch (e) { return fail(safeError(e)); }
  refresh();
  return ok({ message: "Milestone saved." });
}

export async function toggleMilestone(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid milestone.");
  const done = fd.get("done") === "1";
  const { error } = await supabase.from("project_milestones").update({ status: done ? "done" : "open" }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh();
  return ok();
}

export async function deleteMilestone(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid milestone.");
  const { error } = await supabase.from("project_milestones").delete().eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh();
  return ok({ message: "Milestone deleted." });
}
