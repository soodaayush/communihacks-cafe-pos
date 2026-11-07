// Run: npx tsx src/lib/whatif-game.test.ts
import assert from "node:assert/strict";
import type { MenuItem } from "./types";
import { compare } from "./whatif";
import { makeScenario, reasons } from "./whatif-game";

const item = (id: string, priceCents: number, costCents: number): MenuItem => ({
  id,
  name: id,
  imagePublicId: "",
  category: "drink",
  priceCents,
  costCents,
  stock: 20,
  reorderLevel: 5,
});
const menu = [item("coffee", 200, 60), item("cookie", 100, 25), item("sandwich", 450, 180)];
const sold = { coffee: 21, cookie: 17, sandwich: 6 };

// Seeded random, so the test is the same every run.
let seed = 7;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const seen = new Set<string>();
for (let i = 0; i < 200; i++) {
  const s = makeScenario(menu, sold, random);
  assert.ok(s, "a scenario is always found for a normal menu");
  // Every round has a clear answer, and the price stays above what the item costs.
  assert.notEqual(compare(s.now, s.next), "same");
  assert.ok(s.next.priceCents > s.item.costCents);
  assert.equal(s.up, s.next.priceCents > s.now.priceCents);
  // Higher price: fewer people. Lower price: more people.
  assert.equal(s.up, s.next.soldPerDay < s.now.soldPerDay);
  // The winner really is the jar with more money.
  assert.equal(s.winner === "next", s.next.keepPerDayCents > s.now.keepPerDayCents);
  seen.add(`${s.up ? "up" : "down"}-${s.winner}`);
  assert.ok(reasons(s).jar.length > 0);
}
// Rounds mix price rises and cuts, with both outcomes, so there is no pattern to memorise.
assert.ok(seen.size >= 3, `expected variety, got ${[...seen].join(", ")}`);

// Items nobody buys are skipped; an empty menu gives no round.
assert.equal(makeScenario([item("x", 200, 60)], { x: 0 }, random), null);
assert.equal(makeScenario([], {}, random), null);
console.log("whatif-game ok", [...seen].sort().join(" "));
