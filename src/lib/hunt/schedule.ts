/**
 * Daily-run scheduling. Vercel Hobby crons run once a day per entry with ±59 min precision, so
 * vercel.json holds 24 daily entries (one per UTC hour) and each firing asks: "which users are due now?"
 * A user is due when their local time has passed their chosen time-of-day (within CATCH_UP_MIN)
 * and they have not already run on their local date.
 */
export const CATCH_UP_MIN = 6 * 60;

export function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return { ymd: `${get("year")}-${get("month")}-${get("day")}`, hour, minute, minutes: hour * 60 + minute };
}

export function validTimeZone(tz: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); return true; } catch { return false; }
}

export function isDue(input: { now: Date; timeZone: string; hour: number; minute: number; lastRunAt: Date | null }) {
  const tz = validTimeZone(input.timeZone) ? input.timeZone : "Asia/Kolkata";
  const now = localParts(input.now, tz);
  const wanted = Math.min(23, Math.max(0, input.hour)) * 60 + Math.min(59, Math.max(0, input.minute));
  if (now.minutes < wanted || now.minutes - wanted > CATCH_UP_MIN) return false;
  if (input.lastRunAt && localParts(input.lastRunAt, tz).ymd === now.ymd) return false;
  return true;
}

/** Human text for the settings page: when the next run is expected (UTC-hour slot granularity on Hobby). */
export function nextRunText(input: { now: Date; timeZone: string; hour: number; minute: number; lastRunAt: Date | null }) {
  const tz = validTimeZone(input.timeZone) ? input.timeZone : "Asia/Kolkata";
  const now = localParts(input.now, tz);
  const wanted = input.hour * 60 + input.minute;
  const ranToday = input.lastRunAt && localParts(input.lastRunAt, tz).ymd === now.ymd;
  const hh = String(input.hour).padStart(2, "0") + ":" + String(input.minute).padStart(2, "0");
  if (!ranToday && now.minutes <= wanted + CATCH_UP_MIN) return now.minutes >= wanted ? "due at the next hourly check" : `today at ${hh}`;
  return `tomorrow at ${hh}`;
}

export const CRON_SLOTS = Array.from({ length: 24 }, (_, h) => h);
