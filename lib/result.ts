export type Result = { ok: true; message?: string; href?: string } | { ok: false; error: string };
export const ok = (extra: { message?: string; href?: string } = {}): Result => ({ ok: true, ...extra });
export const fail = (error: string): Result => ({ ok: false, error });

/** Map a database/validation error to a safe, user-facing message (never leaks internals). */
export function safeError(e: unknown): string {
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "";
  if (/violates foreign key|not present in table/i.test(msg)) return "That link is not allowed (record not found).";
  if (/duplicate key|already exists/i.test(msg)) return "That already exists.";
  if (/check constraint/i.test(msg)) return "A value is out of range or invalid.";
  if (/row-level security|permission denied/i.test(msg)) return "Not allowed.";
  return "Could not save. Try again.";
}
