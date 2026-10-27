import { describe, expect, it } from "vitest";
import { addDays, addMonths, dateStrOf, isOverdue, localToUtc, rangeUtc, utcToLocalInput, weekStartOf } from "@/lib/dates";

const TZ = "Africa/Johannesburg"; // UTC+2, no DST

describe("dates", () => {
  it("converts local wall time to UTC and back", () => {
    expect(localToUtc("2026-10-27T00:30", TZ).toISOString()).toBe("2026-10-26T22:30:00.000Z");
    expect(utcToLocalInput("2026-10-26T22:30:00.000Z", TZ)).toBe("2026-10-27T00:30");
  });
  it("date of instant respects timezone", () => {
    expect(dateStrOf("2026-10-26T22:30:00.000Z", TZ)).toBe("2026-10-27");
    expect(dateStrOf("2026-10-26T22:30:00.000Z", "UTC")).toBe("2026-10-26");
  });
  it("date-only arithmetic does not shift", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addMonths("2026-12-15", 1)).toBe("2027-01-01");
  });
  it("week starts on configured day", () => {
    expect(weekStartOf("2026-10-27", 1)).toBe("2026-10-26"); // Tue -> Mon
    expect(weekStartOf("2026-10-27", 0)).toBe("2026-10-25"); // Tue -> Sun
  });
  it("day range is local midnight to midnight", () => {
    const r = rangeUtc("2026-10-27", 1, TZ);
    expect(r.start.toISOString()).toBe("2026-10-26T22:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-10-27T22:00:00.000Z");
  });
  it("undated tasks are never overdue; done/cancelled never overdue", () => {
    const now = new Date("2026-10-27T12:00:00Z");
    expect(isOverdue({ due_at: null, status: "todo" }, now)).toBe(false);
    expect(isOverdue({ due_at: "2026-10-26T10:00:00Z", status: "todo" }, now)).toBe(true);
    expect(isOverdue({ due_at: "2026-10-26T10:00:00Z", status: "done" }, now)).toBe(false);
    expect(isOverdue({ due_at: "2026-10-26T10:00:00Z", status: "cancelled" }, now)).toBe(false);
    expect(isOverdue({ due_at: "2026-10-28T10:00:00Z", status: "todo" }, now)).toBe(false);
  });
});
