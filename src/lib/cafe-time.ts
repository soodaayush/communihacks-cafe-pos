// The café's own clock. A "day" is a day in Kitchener-Waterloo, not a UTC day: otherwise "Today"
// would flip over at 7 pm (8 pm in summer) and the evening's sales would land on tomorrow.
// Safe on client and server. Daylight saving is handled by the browser/Node time zone data.
//
// The same time zone is written into the database's continuous aggregates (db/schema.sql), so the
// two must change together.

export const CAFE_TZ = "America/Toronto";

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAFE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const partsFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: CAFE_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** The café's calendar date of an instant, as YYYY-MM-DD. */
export const cafeDate = (at: Date = new Date()): string => dateFormat.format(at);

/** How far the café's clock is from UTC at an instant, in minutes (Toronto: -300 or -240). */
function offsetMinutes(at: number): number {
  const p = Object.fromEntries(partsFormat.formatToParts(at).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(at / 1000) * 1000) / 60_000);
}

/** The instant when the café's clock shows `minutes` after midnight on `date` (YYYY-MM-DD). */
export function cafeTime(date: string, minutes = 0): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  let at = guess - offsetMinutes(guess) * 60_000;
  // Near a daylight-saving change the first guess can be an hour out: correct it once.
  at = guess - offsetMinutes(at) * 60_000;
  return new Date(at);
}

/** `date` moved by `days` calendar days (YYYY-MM-DD in, YYYY-MM-DD out). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Day of the week of a calendar date: 0 = Sunday. */
export const weekdayOf = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

/**
 * [start, end) of `days` café days ending with today, shifted back by `offsetDays`:
 * dayWindow(7) = the last 7 days including today; dayWindow(7, 7) = the 7 days before those.
 */
export function dayWindow(days: number, offsetDays = 0, now: Date = new Date()): [Date, Date] {
  const lastDay = addDays(cafeDate(now), -offsetDays);
  return [cafeTime(addDays(lastDay, 1 - days)), cafeTime(addDays(lastDay, 1))];
}
