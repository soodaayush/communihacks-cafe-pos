// Run: npx tsx src/lib/budget.test.ts
import assert from "node:assert/strict";
import { billsCover, buildMonths, forecastMonth } from "./budget";

const months = buildMonths(
  [
    { date: "2026-10-30", moneyInCents: 1000 },
    { date: "2026-10-31", moneyInCents: 500 },
    { date: "2026-11-01", moneyInCents: 2000 },
  ],
  [
    { id: "a", type: "rent", amountCents: 800, date: "2026-10-31" },
    { id: "b", type: "inventory", amountCents: 300, date: "2026-11-01" },
    { id: "c", type: "salary", amountCents: 4000, date: "2026-11-01" },
  ],
  10_000,
);

assert.deepEqual(
  months.map((m) => [m.month, m.openingCents, m.inCents, m.outCents, m.closingCents]),
  [
    ["2026-10", 10_000, 1500, 800, 10_700],
    ["2026-11", 10_700, 2000, 4300, 8400], // November starts with October's closing balance
  ],
);
assert.equal(months[1].spentCents.salary, 4000);
assert.equal(months[1].spentCents.rent, 0);
// Each month's plan is the month before's real spending; the first month has none.
assert.equal(months[0].planCents, null);
assert.deepEqual(months[1].planCents, { rent: 800, salary: 0, inventory: 0, other: 0 });
assert.deepEqual(buildMonths([], [], 500), []);

// Break-even: November's bills (4300 so far) already beat its plan (October's 800), so 4300 is needed.
assert.deepEqual(billsCover(months[1]), { needCents: 4300, toGoCents: 2300, extraCents: 0 });
// October has no plan, so its own bills (800) count; 1500 came in, 700 extra.
assert.deepEqual(billsCover(months[0]), { needCents: 800, toGoCents: 0, extraCents: 700 });

// Forecast: 2000 in after 1 day of a 30-day month = 2000/day; 4300 of bills reached on day 3.
assert.deepEqual(forecastMonth(months[1], 1, 30), {
  paceCents: 2000,
  projectedCents: 60_000,
  coverDay: 3,
});
// Too slow to reach the bills this month -> no cover day.
assert.equal(forecastMonth({ ...months[1], inCents: 100 }, 1, 30).coverDay, null);
console.log("budget ok");
