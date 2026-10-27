import { z } from "zod";
import { localToUtc } from "@/lib/dates";

export const uuid = z.string().uuid();
export const optUuid = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable());
export const optText = (max = 20000) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().max(max).nullable());
export const reqText = (max = 300) => z.string().trim().min(1, "Required").max(max);
export const hexColor = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable());
export const optInt = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable());
export const optDate = z.preprocess((v) => (v === "" || v == null ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

/** Form value "YYYY-MM-DDTHH:mm" (wall time in user tz) -> ISO UTC string or null. */
export function localDateTime(tz: string) {
  return z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Invalid date/time").nullable().transform((v) => (v ? localToUtc(v, tz).toISOString() : null)),
  );
}

export function formObject(fd: FormData): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(fd.keys())) {
    const all = fd.getAll(key);
    out[key] = all.length > 1 ? all : all[0];
  }
  return out;
}

export function firstIssue(e: z.ZodError): string {
  const i = e.issues[0];
  return i ? `${i.path.join(".") || "Input"}: ${i.message}` : "Invalid input.";
}

export function parseTags(raw: FormDataEntryValue | null | undefined): string[] {
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const k = t.toLowerCase();
    if (!seen.has(k) && t.length <= 40) { seen.add(k); out.push(t); }
  }
  return out.slice(0, 20);
}
