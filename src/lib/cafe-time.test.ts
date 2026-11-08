// Run: npx tsx src/lib/cafe-time.test.ts
import assert from "node:assert/strict";
import { addDays, cafeDate, cafeTime, dayWindow, weekdayOf } from "./cafe-time";

// 8 pm in Toronto on Nov 7 is already Nov 8 in UTC: the café's day is still Nov 7.
assert.equal(cafeDate(new Date("2026-11-08T01:00:00Z")), "2026-11-07");
assert.equal(cafeDate(new Date("2026-11-08T05:00:00Z")), "2026-11-08"); // midnight in Toronto
// Summer (daylight saving, UTC-4): 11 pm on July 1 is July 2 in UTC.
assert.equal(cafeDate(new Date("2026-07-02T03:00:00Z")), "2026-07-01");

// Midnight and opening time, winter and summer.
assert.equal(cafeTime("2026-11-07").toISOString(), "2026-11-07T05:00:00.000Z"); // EST (UTC-5)
assert.equal(cafeTime("2026-11-08").toISOString(), "2026-11-08T05:00:00.000Z"); // EST
assert.equal(cafeTime("2026-11-09", 8 * 60).toISOString(), "2026-11-09T13:00:00.000Z"); // 8 am
assert.equal(cafeTime("2026-07-15", 8 * 60).toISOString(), "2026-07-15T12:00:00.000Z"); // 8 am EDT
// The day daylight saving ends (Nov 1, 2026): midnight is still on summer time.
assert.equal(cafeTime("2026-11-01").toISOString(), "2026-11-01T04:00:00.000Z");
assert.equal(cafeTime("2026-11-01", 12 * 60).toISOString(), "2026-11-01T17:00:00.000Z");

assert.equal(addDays("2026-11-30", 1), "2026-12-01");
assert.equal(addDays("2026-03-01", -1), "2026-02-28");
assert.equal(weekdayOf("2026-11-07"), 6); // Saturday

// "Today" at 8 pm Toronto = Nov 7, from its midnight to the next.
const at8pm = new Date("2026-11-08T01:00:00Z");
assert.deepEqual(
  dayWindow(1, 0, at8pm).map((d) => d.toISOString()),
  ["2026-11-07T05:00:00.000Z", "2026-11-08T05:00:00.000Z"],
);
// The last 7 days, and the 7 before them, end where the next begins.
assert.equal(dayWindow(7, 7, at8pm)[1].toISOString(), dayWindow(7, 0, at8pm)[0].toISOString());
// Daylight saving starts Mar 8, 2026: midnight on standard time, noon on summer time.
assert.equal(cafeTime("2026-03-08").toISOString(), "2026-03-08T05:00:00.000Z");
assert.equal(cafeTime("2026-03-08", 12 * 60).toISOString(), "2026-03-08T16:00:00.000Z");
// The day daylight saving ends is 25 hours long; the day it starts is 23.
assert.equal((cafeTime("2026-11-02").getTime() - cafeTime("2026-11-01").getTime()) / 3_600_000, 25);
assert.equal((cafeTime("2026-03-09").getTime() - cafeTime("2026-03-08").getTime()) / 3_600_000, 23);
console.log("cafe-time ok");
