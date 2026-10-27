"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";
import { firstIssue, formObject, hexColor, reqText } from "@/lib/validation/common";

const refresh = () => revalidatePath("/", "layout");
const validTz = (tz: string) => { try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; } };

export async function saveProfile(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({ display_name: reqText(80), timezone: z.string().refine(validTz, "Unknown time zone") }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { error } = await supabase.from("profiles").update(p.data).eq("id", user.id);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Profile saved." });
}

export async function savePrefs(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({
    default_task_priority: z.enum(["low", "medium", "high", "urgent"]), time_format: z.enum(["12h", "24h"]), week_starts_on: z.coerce.number().int().min(0).max(6),
    default_meeting_lead_minutes: z.coerce.number().int().min(0).max(10080), default_deadline_lead_minutes: z.coerce.number().int().min(0).max(43200),
  }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { error } = await supabase.from("user_preferences").update({ ...p.data, email_reminders_enabled: fd.get("email_reminders_enabled") === "on" }).eq("user_id", user.id);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Preferences saved. They apply to reminders created from now on." });
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "category";

export async function saveCategory(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({ id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()), name: reqText(60), color: hexColor.refine((c) => !!c, "Pick a colour") }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { id, name, color } = p.data;
  const r = id ? await supabase.from("categories").update({ name, color: color! }).eq("id", id) : await supabase.from("categories").insert({ user_id: user.id, name, color: color!, slug: slugify(name) });
  if (r.error) return fail(safeError(r.error));
  refresh(); return ok({ message: id ? "Category saved." : "Category added." });
}

export async function deleteCategory(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid category.");
  // Items keep existing; their category link is cleared by the database.
  const { error } = await supabase.from("categories").delete().eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Category deleted. Items using it are now uncategorised." });
}

export async function sendPasswordReset(): Promise<Result> {
  const { supabase, user } = await getCtx();
  const { error } = await supabase.auth.resetPasswordForEmail(user.email!);
  if (error) return fail("Could not send the reset email. Try again later.");
  return ok({ message: "Reset email sent to your account address." });
}

export async function changePassword(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const p = z.object({ password: z.string().min(10, "Use at least 10 characters").max(200), confirm: z.string() }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  if (p.data.password !== p.data.confirm) return fail("Passwords do not match.");
  const { error } = await supabase.auth.updateUser({ password: p.data.password });
  if (error) return fail("Could not update the password.");
  return ok({ message: "Password updated." });
}

/** Deletes the auth user; every private row cascades from the profile. Needs the server-only secret key. */
export async function deleteAccount(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  if (String(fd.get("confirm") ?? "").trim().toLowerCase() !== user.email?.toLowerCase()) return fail("Type your email address exactly to confirm.");
  const admin = createAdminClient();
  if (!admin) return fail("Account deletion is not configured on this deployment.");
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return fail("Could not delete the account.");
  await supabase.auth.signOut();
  redirect("/login");
}
