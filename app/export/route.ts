import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/permissions/owner";

const TABLES = ["categories", "projects", "project_milestones", "tasks", "ideas", "notes", "events", "event_agenda_items", "reviews", "weekly_reviews", "tags",
  "task_tags", "idea_tags", "note_tags", "event_tags", "review_tags", "idea_notes", "task_notes", "event_notes", "task_events", "review_tasks"] as const;
type T = (typeof TABLES)[number];

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Owner-only export. RLS guarantees only the owner's rows are returned. JSON = everything; CSV = one table (?table=tasks). */
export async function GET(req: NextRequest) {
  const { supabase } = await requireOwner();
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const headers = { "Cache-Control": "private, no-store" };
  const strip = (rows: Record<string, unknown>[] | null) => (rows ?? []).map((r) => { const c = { ...r }; delete c.fts; return c; });
  if (format === "csv") {
    const table = req.nextUrl.searchParams.get("table") as T;
    if (!TABLES.includes(table)) return NextResponse.json({ error: "Unknown table" }, { status: 400, headers });
    const { data, error } = await supabase.from(table).select("*").limit(50000);
    if (error) return NextResponse.json({ error: "Export failed" }, { status: 500, headers });
    const rows = strip(data as Record<string, unknown>[]);
    const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const body = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
    return new NextResponse(body, { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${table}.csv"` } });
  }
  const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*").limit(50000);
    if (error) return NextResponse.json({ error: "Export failed" }, { status: 500, headers });
    out[t] = strip(data as Record<string, unknown>[]);
  }
  return new NextResponse(JSON.stringify(out, null, 2), { headers: { ...headers, "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="command-centre-export.json"' } });
}
