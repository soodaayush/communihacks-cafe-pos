// Run: npx tsx src/lib/sale-math.test.ts
import assert from "node:assert/strict";
import { HttpError } from "./api";
import { MAX_PER_LINE, parseSaleBody, priceSale, takeFromStock } from "./sale-math";

const COFFEE = "00000000-0000-4000-8000-000000000001";
const COOKIE = "00000000-0000-4000-8000-000000000002";
const BEANS = "10000000-0000-4000-8000-000000000001";
const CUPS = "10000000-0000-4000-8000-000000000002";
const now = new Date("2026-11-07T20:00:00Z");
const fails = (body: Record<string, unknown>, status = 400) =>
  assert.throws(
    () => parseSaleBody(body, now),
    (e) => e instanceof HttpError && e.status === status,
  );

// --- checking what the register sent
const ok = parseSaleBody(
  {
    paymentMethod: "cash",
    items: [
      { menuItemId: COFFEE, qty: 2, size: "L" },
      { menuItemId: COFFEE, qty: 1, size: "L" }, // same item and size: merged
      { menuItemId: COFFEE, qty: 1 },
      { menuItemId: COOKIE, qty: 3 },
    ],
  },
  now,
);
assert.deepEqual(ok.lines, [
  { menuItemId: COFFEE, size: "L", qty: 3 },
  { menuItemId: COFFEE, size: undefined, qty: 1 },
  { menuItemId: COOKIE, size: undefined, qty: 3 },
]);
fails({ paymentMethod: "bitcoin", items: [{ menuItemId: COFFEE, qty: 1 }] });
fails({ paymentMethod: "cash", items: [] });
fails({ paymentMethod: "cash", items: [{ menuItemId: "not-an-id", qty: 1 }] });
fails({ paymentMethod: "cash", items: [{ menuItemId: COFFEE, qty: 0 }] });
fails({ paymentMethod: "cash", items: [{ menuItemId: COFFEE, qty: 1.5 }] });
fails({ paymentMethod: "cash", items: [{ menuItemId: COFFEE, qty: 9999 }] }); // a stray tap
fails({ paymentMethod: "cash", items: [{ menuItemId: COFFEE, qty: 1, size: "XL" }] });
fails({
  paymentMethod: "cash",
  items: [
    { menuItemId: COOKIE, qty: MAX_PER_LINE },
    { menuItemId: COOKIE, qty: 1 },
  ],
});
fails({
  paymentMethod: "cash",
  items: Array.from({ length: 31 }, () => ({ menuItemId: COFFEE, qty: 1 })),
});
fails({ paymentMethod: "cash", items: [{ menuItemId: COFFEE, qty: 1 }], clientRef: "x" });

// An offline sale keeps its time if recent; a time far away or in the future is ignored.
const at = (soldAt: string) =>
  parseSaleBody({ paymentMethod: "cash", items: [{ menuItemId: COFFEE, qty: 1 }], soldAt }, now)
    .soldAt;
assert.equal(at("2026-11-07T18:00:00Z")?.toISOString(), "2026-11-07T18:00:00.000Z");
assert.equal(at("2026-10-01T18:00:00Z"), undefined); // too old
assert.equal(at("2026-11-08T20:00:00Z"), undefined); // the future
assert.equal(at("not a date"), undefined);
assert.equal(
  parseSaleBody(
    { paymentMethod: "debit", items: [{ menuItemId: COFFEE, qty: 1 }], clientRef: "sale-1234abcd" },
    now,
  ).clientRef,
  "sale-1234abcd",
);

// --- pricing and what comes out of stock
const menu = [
  { id: COFFEE, category: "drink", price_cents: 200, cost_cents: 0 },
  { id: COOKIE, category: "food", price_cents: 100, cost_cents: 25 },
];
const recipes = [
  { menu_item_id: COFFEE, size: "S" as const, inventory_item_id: BEANS, qty: 14, unit_cost: 1.8 },
  { menu_item_id: COFFEE, size: "L" as const, inventory_item_id: BEANS, qty: 22, unit_cost: 1.8 },
  { menu_item_id: COFFEE, size: "S" as const, inventory_item_id: CUPS, qty: 1, unit_cost: 8 },
  { menu_item_id: COFFEE, size: "L" as const, inventory_item_id: CUPS, qty: 1, unit_cost: 8 },
];
const priced = priceSale(ok.lines, menu, recipes);
assert.deepEqual(
  priced.items.map((i) => [i.size ?? null, i.qty, i.unitPriceCents, i.unitCostCents]),
  [
    ["L", 3, 300, 48], // large = $2 + $1; cost = 22 g x 1.8c + a cup (8c) = 47.6c
    ["S", 1, 200, 33], // no size = small; 14 x 1.8 + 8 = 33.2c
    [null, 3, 100, 25], // food: menu price and cost
  ],
);
assert.equal(priced.totalCents, 3 * 300 + 200 + 3 * 100);
assert.deepEqual([...priced.shelf], [[COOKIE, 3]]); // only food comes off the shelf
assert.deepEqual(
  [...priced.used],
  [
    [BEANS, 3 * 22 + 14],
    [CUPS, 4],
  ],
); // drinks use the back room
assert.throws(
  () => priceSale([{ menuItemId: COOKIE, size: "L", qty: 1 }], menu, recipes),
  HttpError,
);
assert.throws(
  () => priceSale([{ menuItemId: "00000000-0000-4000-8000-00000000ffff", qty: 1 }], menu, recipes),
  (e) => e instanceof HttpError && e.status === 404,
);

// --- never below zero: only what is there is taken (and logged)
assert.deepEqual(
  takeFromStock(
    [
      { id: BEANS, stock: 50 },
      { id: CUPS, stock: 0 },
    ],
    priced.used,
  ),
  [{ id: BEANS, amount: 50 }],
);
console.log("sale-math ok");
