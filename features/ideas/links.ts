"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";

const ids = z.object({ idea_id: z.string().uuid(), note_id: z.string().uuid() });

export async function addIdeaNote(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = ids.safeParse({ idea_id: fd.get("idea_id"), note_id: fd.get("note_id") });
  if (!p.success) return fail("Choose a note to link.");
  const { error } = await supabase.from("idea_notes").insert({ ...p.data, user_id: user.id });
  if (error) return fail(safeError(error));
  revalidatePath("/", "layout"); return ok({ message: "Linked." });
}

export async function removeIdeaNote(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const p = ids.safeParse({ idea_id: fd.get("idea_id"), note_id: fd.get("note_id") });
  if (!p.success) return fail("Invalid link.");
  const { error } = await supabase.from("idea_notes").delete().eq("idea_id", p.data.idea_id).eq("note_id", p.data.note_id);
  if (error) return fail(safeError(error));
  revalidatePath("/", "layout"); return ok({ message: "Unlinked." });
}
