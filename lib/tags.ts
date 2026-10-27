import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Kind = "task" | "idea" | "note" | "event" | "review";
const JOIN: Record<Kind, "task_tags" | "idea_tags" | "note_tags" | "event_tags" | "review_tags"> = {
  task: "task_tags", idea: "idea_tags", note: "note_tags", event: "event_tags", review: "review_tags",
};

/** Replace the tag set of one record. Tags are created on demand; ownership is enforced by composite FKs + RLS. */
export async function syncTags(supabase: SupabaseClient<Database>, userId: string, kind: Kind, recordId: string, names: string[]) {
  const join = JOIN[kind];
  const idCol = `${kind}_id` as const;
  let tagIds: string[] = [];
  if (names.length) {
    const { data: existing, error: e1 } = await supabase.from("tags").select("id,name");
    if (e1) throw e1;
    const byName = new Map((existing ?? []).map((t) => [t.name.toLowerCase(), t.id]));
    const missing = names.filter((n) => !byName.has(n.toLowerCase()));
    if (missing.length) {
      const { data: created, error: e2 } = await supabase.from("tags").insert(missing.map((name) => ({ user_id: userId, name }))).select("id,name");
      if (e2) throw e2;
      created?.forEach((t) => byName.set(t.name.toLowerCase(), t.id));
    }
    tagIds = names.map((n) => byName.get(n.toLowerCase())!).filter(Boolean);
  }
  // Only the join rows are replaced; tag records themselves are kept.
  const del = await (supabase.from(join) as unknown as { delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> } }).delete().eq(idCol, recordId);
  if (del.error) throw del.error;
  if (tagIds.length) {
    const rows = tagIds.map((tag_id) => ({ user_id: userId, [idCol]: recordId, tag_id }));
    const ins = await (supabase.from(join) as unknown as { insert: (r: unknown) => Promise<{ error: { message: string } | null }> }).insert(rows);
    if (ins.error) throw ins.error;
  }
}

export async function loadTags(supabase: SupabaseClient<Database>, kind: Kind, recordIds: string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!recordIds.length) return out;
  const join = JOIN[kind];
  const idCol = `${kind}_id`;
  const { data } = await (supabase.from(join) as unknown as { select: (s: string) => { in: (c: string, v: string[]) => Promise<{ data: Array<Record<string, unknown>> | null }> } })
    .select(`${idCol}, tags(name)`).in(idCol, recordIds);
  for (const row of data ?? []) {
    const id = row[idCol] as string;
    const t = row.tags as { name: string } | null;
    if (t) out.set(id, [...(out.get(id) ?? []), t.name]);
  }
  return out;
}
