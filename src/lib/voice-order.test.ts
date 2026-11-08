// Run: npx tsx src/lib/voice-order.test.ts
import assert from "node:assert/strict";
import { describeOrder, parseOrder } from "./voice-order";
import type { MenuItem } from "./types";

const item = (name: string, category: string): MenuItem => ({
  id: name.toLowerCase().replace(/ /g, "-"),
  name,
  imagePublicId: "",
  category,
  priceCents: 200,
  costCents: 50,
  stock: 10,
  reorderLevel: 2,
});
const menu = [
  item("Coffee", "drink"),
  item("Tea", "drink"),
  item("Hot Chocolate", "drink"),
  item("Juice", "drink"),
  item("Lemonade", "drink"),
  item("Muffin", "food"),
  item("Cookie", "food"),
  item("Sandwich", "food"),
  item("Toast", "food"),
];
// [name, size, qty] for easy comparing
const lines = (text: string) =>
  parseOrder(text, menu).lines.map((l) => [l.name, l.size ?? null, l.qty]);

assert.deepEqual(lines("two large coffees and a muffin"), [
  ["Coffee", "L", 2],
  ["Muffin", null, 1],
]);
assert.deepEqual(lines("I would like a small tea please"), [["Tea", "S", 1]]);
assert.deepEqual(lines("one small and one large coffee"), [
  ["Coffee", "S", 1],
  ["Coffee", "L", 1],
]);
assert.deepEqual(lines("three cookies"), [["Cookie", null, 3]]);
assert.deepEqual(lines("5 hot chocolates"), [["Hot Chocolate", "S", 5]]); // a drink with no size is a small
assert.deepEqual(lines("a coffee large and a cookie"), [
  ["Coffee", "L", 1],
  ["Cookie", null, 1],
]);
assert.deepEqual(lines("two sandwiches and a juice"), [
  ["Sandwich", null, 2],
  ["Juice", "S", 1],
]);
assert.deepEqual(lines("a cofee"), [["Coffee", "S", 1]]); // a near miss still counts
assert.deepEqual(lines("two small coffees and one large"), [
  ["Coffee", "S", 2],
  ["Coffee", "L", 1],
]);
assert.deepEqual(lines("large muffin"), [["Muffin", null, 1]]); // food has no sizes
assert.deepEqual(lines("orange juice and hot cocoa"), [
  ["Juice", "S", 1],
  ["Hot Chocolate", "S", 1],
]);
assert.deepEqual(lines("25 coffees"), [["Coffee", "S", 20]]); // capped
assert.deepEqual(lines("a coffee and a coffee"), [["Coffee", "S", 2]]); // same item + size adds up
assert.deepEqual(lines("Um, two lemonades, medium."), [["Lemonade", "M", 2]]);

const nothing = parseOrder("banana split", menu);
assert.deepEqual(nothing.lines, []);
assert.deepEqual(nothing.unknown, ["banana", "split"]);
assert.deepEqual(parseOrder("", menu), { lines: [], unknown: [] });

assert.equal(
  describeOrder(parseOrder("two large coffees and a muffin", menu).lines),
  "two large coffees and one muffin",
);
assert.equal(
  describeOrder(parseOrder("a small hot chocolate", menu).lines),
  "one small hot chocolate",
);
assert.equal(
  describeOrder(parseOrder("3 cookies, a tea and two sandwiches", menu).lines),
  "three cookies, one small tea and two sandwiches",
);
console.log("voice-order ok");
