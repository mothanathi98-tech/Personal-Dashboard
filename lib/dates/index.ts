export const DEFAULT_TZ = "Africa/Johannesburg";

const pad = (n: number) => String(n).padStart(2, "0");

function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour, mm: +p.minute, ss: +p.second };
}

function offsetMs(date: Date, tz: string): number {
  const p = parts(date, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert a wall-clock value in `tz` ("YYYY-MM-DD" or "YYYY-MM-DDTHH:mm") to the matching UTC instant. */
export function localToUtc(local: string, tz: string = DEFAULT_TZ): Date {
  const [d, t = "00:00"] = local.split("T");
  const [y, m, day] = d.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  const first = guess - offsetMs(new Date(guess), tz);
  return new Date(guess - offsetMs(new Date(first), tz));
}

/** UTC instant -> "YYYY-MM-DDTHH:mm" wall-clock string in `tz` (for datetime-local inputs). */
export function utcToLocalInput(iso: string | Date | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!iso) return "";
  const p = parts(new Date(iso), tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.hh)}:${pad(p.mm)}`;
}

/** Calendar date ("YYYY-MM-DD") of an instant in `tz`. */
export function dateStrOf(iso: string | Date, tz: string = DEFAULT_TZ): string {
  const p = parts(new Date(iso), tz);
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export const todayStr = (tz: string = DEFAULT_TZ, now: Date = new Date()) => dateStrOf(now, tz);

/** Pure date-string arithmetic (no timezone involved, so dates never shift). */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** First day of the week containing dateStr. weekStartsOn: 0=Sun .. 6=Sat. */
export function weekStartOf(dateStr: string, weekStartsOn = 1): string {
  const diff = (dayOfWeek(dateStr) - weekStartsOn + 7) % 7;
  return addDays(dateStr, -diff);
}

export function monthStartOf(dateStr: string): string {
  return dateStr.slice(0, 8) + "01";
}

export function addMonths(dateStr: string, n: number): string {
  const [y, m] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-01`;
}

/** [start, end) UTC instants covering whole calendar days dateStr..(dateStr + days). */
export function rangeUtc(dateStr: string, days: number, tz: string = DEFAULT_TZ) {
  return { start: localToUtc(dateStr, tz), end: localToUtc(addDays(dateStr, days), tz) };
}

export function formatDateTime(iso: string | Date | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: tz, hourCycle: "h23" }).format(new Date(iso));
}

export function formatDate(iso: string | Date | null | undefined, tz: string = DEFAULT_TZ): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: tz }).format(new Date(iso));
}

/** Format a date-only string ("YYYY-MM-DD") without any timezone conversion. */
export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatTime(iso: string | Date, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-ZA", { timeStyle: "short", timeZone: tz, hourCycle: "h23" }).format(new Date(iso));
}

export type OverdueInput = { due_at: string | null; status: string; archived_at?: string | null };

/** Overdue = has a due date in the past AND is not done/cancelled. Undated tasks are never overdue. */
export function isOverdue(t: OverdueInput, now: Date = new Date()): boolean {
  if (!t.due_at) return false;
  if (t.status === "done" || t.status === "cancelled") return false;
  if (t.archived_at) return false;
  return new Date(t.due_at).getTime() < now.getTime();
}
