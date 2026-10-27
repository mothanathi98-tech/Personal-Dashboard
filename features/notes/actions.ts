"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCtx } from "@/lib/permissions/owner";
import { fail, ok, safeError, type Result } from "@/lib/result";
import { firstIssue, formObject, optUuid, parseTags, reqText } from "@/lib/validation/common";
import { syncTags } from "@/lib/tags";

const refresh = () => revalidatePath("/", "layout");
const uid = z.string().uuid();

export async function saveNote(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const p = z.object({ id: optUuid, title: reqText(300), content: z.string().max(200000).default(""), category_id: optUuid, project_id: optUuid, expected_updated_at: z.string().optional() }).safeParse(formObject(fd));
  if (!p.success) return fail(firstIssue(p.error));
  const { id, expected_updated_at, ...v } = p.data;
  try {
    let nid = id;
    if (id) {
      // Optimistic concurrency: refuse to overwrite a newer version saved elsewhere.
      let q = supabase.from("notes").update(v).eq("id", id);
      if (expected_updated_at) q = q.eq("updated_at", expected_updated_at);
      const r = await q.select("id");
      if (r.error) throw r.error;
      if (!r.data?.length) return fail("This note changed elsewhere. Copy your edits, reload, and save again.");
    } else {
      const r = await supabase.from("notes").insert({ ...v, user_id: user.id }).select("id").single();
      if (r.error) throw r.error; nid = r.data.id;
    }
    await syncTags(supabase, user.id, "note", nid!, parseTags(fd.get("tags")));
  } catch (e) { return fail(safeError(e)); }
  refresh();
  return ok({ message: id ? "Note saved." : "Note created." });
}

export async function toggleNotePin(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid note.");
  const { error } = await supabase.from("notes").update({ is_pinned: fd.get("pin") === "1" }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok();
}

export async function archiveNote(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid note.");
  const restore = fd.get("restore") === "1";
  const { error } = await supabase.from("notes").update({ archived_at: restore ? null : new Date().toISOString() }).eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: restore ? "Note restored." : "Note archived." });
}

export async function deleteNote(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx(); const id = uid.safeParse(fd.get("id"));
  if (!id.success) return fail("Invalid note.");
  const { error } = await supabase.from("notes").delete().eq("id", id.data);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Note deleted.", href: "/notes" });
}

const KIND = { task: "task_notes", idea: "idea_notes", event: "event_notes" } as const;

/** Link a note to a task, idea or meeting through the explicit, ownership-checked join tables. */
export async function addNoteLink(fd: FormData): Promise<Result> {
  const { supabase, user } = await getCtx();
  const note = uid.safeParse(fd.get("note_id")); const target = uid.safeParse(fd.get("target_id")); const kind = String(fd.get("kind"));
  if (!note.success || !target.success || !(kind in KIND)) return fail("Choose something to link.");
  const k = kind as keyof typeof KIND;
  const row = { user_id: user.id, note_id: note.data, [`${k}_id`]: target.data };
  const { error } = await (supabase.from(KIND[k]) as unknown as { insert: (r: unknown) => Promise<{ error: { message: string } | null }> }).insert(row);
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Linked." });
}

export async function removeNoteLink(fd: FormData): Promise<Result> {
  const { supabase } = await getCtx();
  const note = uid.safeParse(fd.get("note_id")); const target = uid.safeParse(fd.get("target_id")); const kind = String(fd.get("kind"));
  if (!note.success || !target.success || !(kind in KIND)) return fail("Invalid link.");
  const k = kind as keyof typeof KIND;
  const q = (supabase.from(KIND[k]) as unknown as { delete: () => { eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } } }).delete().eq("note_id", note.data).eq(`${k}_id`, target.data);
  const { error } = await q;
  if (error) return fail(safeError(error));
  refresh(); return ok({ message: "Unlinked." });
}
