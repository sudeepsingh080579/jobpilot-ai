import { describe, expect, it } from "vitest";
import { CRON_SLOTS, isDue, localParts, nextRunText } from "./schedule";
import vercel from "../../../vercel.json";

const IST = "Asia/Kolkata";
const base = { timeZone: IST, hour: 8, minute: 0, lastRunAt: null as Date | null };
// 08:00 IST = 02:30 UTC
describe("daily schedule", () => {
  it("computes local time in a zone", () => {
    expect(localParts(new Date("2026-10-27T02:30:00Z"), IST)).toMatchObject({ ymd: "2026-10-27", hour: 8, minute: 0 });
    expect(localParts(new Date("2026-10-27T02:30:00Z"), "America/New_York")).toMatchObject({ hour: 22, ymd: "2026-10-26" });
  });
  it("is not due before the chosen time, never early", () => {
    expect(isDue({ ...base, now: new Date("2026-10-27T01:30:00Z") })).toBe(false); // 07:00 IST
    expect(isDue({ ...base, now: new Date("2026-10-27T02:29:00Z") })).toBe(false);
  });
  it("is due from the chosen time through the catch-up window", () => {
    expect(isDue({ ...base, now: new Date("2026-10-27T02:30:00Z") })).toBe(true);
    expect(isDue({ ...base, now: new Date("2026-10-27T03:30:00Z") })).toBe(true); // 09:00 IST
    expect(isDue({ ...base, now: new Date("2026-10-27T08:29:00Z") })).toBe(true); // 13:59 IST
    expect(isDue({ ...base, now: new Date("2026-10-27T09:30:00Z") })).toBe(false); // 15:00 IST, beyond 6 h
  });
  it("runs once per local day", () => {
    const now = new Date("2026-10-27T03:30:00Z");
    expect(isDue({ ...base, now, lastRunAt: new Date("2026-10-27T02:35:00Z") })).toBe(false);
    expect(isDue({ ...base, now, lastRunAt: new Date("2026-10-26T02:35:00Z") })).toBe(true);
  });
  it("respects the user's timezone and minutes", () => {
    const ny = { timeZone: "America/New_York", hour: 7, minute: 30, lastRunAt: null };
    expect(isDue({ ...ny, now: new Date("2026-10-27T11:29:00Z") })).toBe(false); // 07:29 EDT
    expect(isDue({ ...ny, now: new Date("2026-10-27T11:30:00Z") })).toBe(true);
  });
  it("falls back to IST for an invalid zone", () => {
    expect(isDue({ ...base, timeZone: "Nope/Zone", now: new Date("2026-10-27T03:30:00Z") })).toBe(true);
  });
  it("describes the next run", () => {
    expect(nextRunText({ ...base, now: new Date("2026-10-27T01:00:00Z") })).toBe("today at 08:00");
    expect(nextRunText({ ...base, now: new Date("2026-10-27T03:00:00Z") })).toBe("due at the next hourly check");
    expect(nextRunText({ ...base, now: new Date("2026-10-27T03:00:00Z"), lastRunAt: new Date("2026-10-27T02:40:00Z") })).toBe("tomorrow at 08:00");
  });
  it("vercel.json has 24 daily slot entries, none hourly (Hobby rejects those)", () => {
    const crons = vercel.crons as { path: string; schedule: string }[];
    expect(crons).toHaveLength(24);
    for (const h of CRON_SLOTS) expect(crons).toContainEqual({ path: `/api/cron/job-hunt?slot=${h}`, schedule: `30 ${h} * * *` });
    for (const c of crons) expect(c.schedule).toMatch(/^30 \d{1,2} \* \* \*$/);
  });
});
