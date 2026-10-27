"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";

const refresh = () => revalidatePath("/", "layout");

export async function markRead(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid notification.");
  const { error } = await supabase.from("notifications").update({ read_at: fd.get("unread") === "1" ? null : new Date().toISOString() }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok();
}

export async function markAllRead(): Promise<Result> {
  const { supabase } = await getCtx();
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).is("dismissed_at", null);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "All marked as read." });
}

export async function dismissNotification(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = z.string().uuid().safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid notification.");
  const now = new Date().toISOString();
  const { error } = await supabase.from("notifications").update({ dismissed_at: now, read_at: now }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok();
}
