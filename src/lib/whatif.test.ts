// Run: npx tsx src/lib/whatif.test.ts
import assert from "node:assert/strict";
import type { MenuItem } from "./types";
import { compare, estimateSold, outcome, priceRange } from "./whatif";

const coffee: MenuItem = {
  id: "m1",
  name: "Coffee",
  imagePublicId: "",
  category: "drink",
  priceCents: 200,
  costCents: 60,
  stock: 40,
  reorderLevel: 10,
};

// Same price: same sales.
assert.equal(estimateSold(24, 200, 200), 24);
// Higher price: fewer people. Lower price: more.
assert.ok(estimateSold(24, 200, 250) < 24);
assert.ok(estimateSold(24, 200, 150) > 24);

const now = outcome(coffee, 24, 200);
assert.deepEqual(now, {
  priceCents: 200,
  keepEachCents: 140,
  soldPerDay: 24,
  keepPerDayCents: 3360,
});
// The maths shown on screen always adds up: keep per day = keep each × people.
const up = outcome(coffee, 24, 300);
assert.equal(up.keepPerDayCents, up.keepEachCents * up.soldPerDay);

// A very low price can't bring in more than double today's people.
assert.equal(estimateSold(18, 200, 25), 36);

// Below cost loses money on each one.
assert.ok(outcome(coffee, 24, 50).keepEachCents < 0);
// Way too high: fewer people make up less money than now.
assert.equal(compare(now, outcome(coffee, 24, 400)), "less");
assert.equal(compare(now, outcome(coffee, 24, 200)), "same");
// A tiny change (under $1 or 5% a day) reads as "about the same", like the jars look.
assert.equal(compare(outcome(coffee, 21, 200), outcome(coffee, 21, 150)), "same");

assert.deepEqual(priceRange(coffee), { minCents: 25, maxCents: 400 });
console.log("whatif ok");
