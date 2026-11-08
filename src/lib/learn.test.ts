// Run: npx tsx src/lib/learn.test.ts
import assert from "node:assert/strict";
import {
  addQuestions,
  canAdd,
  canChange,
  chainLabels,
  changeQuestion,
  describeTransaction,
  diagnose,
  fallbackExplanation,
  fallbackHints,
  givenCents,
  hasNumberWords,
  isGoodExplanation,
  isGoodHint,
  MAX_HINTS,
  mergeHints,
  units,
  type LearnLine,
  type LearnTransaction,
} from "./learn";

const line = (
  name: string,
  priceCents: number,
  qty: number,
  size?: "S" | "M" | "L",
): LearnLine => ({
  menuItemId: name,
  name,
  imagePublicId: `kwhab/menu/${name.toLowerCase()}`,
  category: size ? "drink" : "food",
  size,
  qty,
  unitPriceCents: priceCents,
});
const tx = (
  id: string,
  lines: LearnLine[],
  paymentMethod: "cash" | "debit" = "cash",
): LearnTransaction => ({
  id,
  createdAt: "2026-11-07T15:00:00.000Z",
  paymentMethod,
  totalCents: lines.reduce((s, l) => s + l.qty * l.unitPriceCents, 0),
  lines,
});

// "2 muffins and a coffee": three units, two additions, ending exactly at the total.
const order = tx("sale-1", [line("Muffin", 250, 2), line("Coffee", 200, 1, "S")]);
assert.equal(units(order).length, 3);
assert.equal(canAdd(order), true);
assert.equal(describeTransaction(order), "2 muffins, 1 small coffee");
assert.equal(
  describeTransaction(tx("s", [line("Sandwich", 450, 2), line("Coffee", 200, 2, "L")])),
  "2 sandwiches, 2 large coffees",
);
const adds = addQuestions(order);
assert.equal(adds.length, 2);
assert.equal(adds[0].correctCents, 500); // 2.50 + 2.50
assert.equal(adds[1].leftCents, 500); // the running total carries on
assert.equal(adds[1].correctCents, order.totalCents); // ends at the transaction total
assert.equal(adds[1].leftLabel, "So far");

// EVERY sale can be practised. One thing: one question that reads the total.
const single = tx("sale-2", [line("Cookie", 100, 1)], "debit");
assert.equal(canAdd(single), true);
const sq = addQuestions(single);
assert.equal(sq.length, 1);
assert.equal(sq[0].op, "single");
assert.equal(sq[0].correctCents, 100);
assert.equal(sq[0].choices.length, 3);

// A card sale still has change practice, as "pretend they paid cash".
assert.equal(canChange(single), true);
const pretend = changeQuestion(single)!;
assert.equal(pretend.pretend, true);
assert.ok(pretend.facts.includes("Pretend they paid cash"));
assert.equal(changeQuestion(order)!.pretend, false);

// A big order is grouped by item: 10 muffins and a coffee is TWO questions, not ten.
const big = tx("sale-big", [line("Muffin", 250, 10), line("Coffee", 300, 1, "L")]);
assert.equal(canAdd(big), true);
const bq = addQuestions(big);
assert.equal(bq.length, 2);
assert.equal(bq[0].op, "times");
assert.equal(bq[0].count, 10);
assert.equal(bq[0].unitCents, 250);
assert.equal(bq[0].correctCents, 2500); // 10 x $2.50
assert.equal(bq[0].ask, "How much for 10 muffins at $2.50 each?");
assert.equal(bq[0].rightLabel, "Muffin × 10"); // short on screen
assert.equal(bq[0].itemsSpoken, "10 muffins"); // natural when spoken
assert.equal(isGoodExplanation(fallbackExplanation(bq[0]), bq[0]), true);
assert.equal(fallbackExplanation(bq[0]), "10 muffins at $2.50 each make $25.00.");
// The finished sum never repeats the same thing ten times.
assert.deepEqual(chainLabels(big), ["Muffin × 10", "Large coffee"]);
assert.deepEqual(chainLabels(order), ["Muffin × 2", "Small coffee"]); // a small order too
assert.deepEqual(chainLabels(single), ["Cookie"]);
assert.equal(bq[1].op, "plus");
assert.equal(bq[1].leftCents, 2500); // the group's total carries on
assert.equal(bq[1].correctCents, big.totalCents);
assert.equal(bq[1].steps, 2);
// Many items of many kinds stay short too.
const lots = tx("sale-lots", [
  line("Muffin", 250, 4),
  line("Cookie", 100, 6),
  line("Tea", 150, 3, "S"),
  line("Coffee", 200, 5, "M"),
]);
const lq = addQuestions(lots);
assert.ok(lq.length <= 7, `${lq.length} questions for 18 items`);
assert.equal(lq.at(-1)!.correctCents, lots.totalCents);
assert.ok(units(lots).length >= 10);
// The skip-count help never reaches the answer: three or more counts are needed to name two of them.
assert.ok(bq[0].facts.includes("$2.50, $5.00"));
const two = addQuestions(tx("sale-two", [line("Muffin", 250, 2), line("Cookie", 100, 5)]));
assert.equal(two[0].op, "times"); // 5 cookies (7 items, grouped)

// Change: the customer gave more than the cost, in a believable amount, and it never changes.
const ch = changeQuestion(order)!;
assert.equal(ch.rightCents, 700);
assert.ok(ch.leftCents > 700 && ch.leftCents % 5 === 0);
assert.equal(ch.correctCents, ch.leftCents - ch.rightCents);
assert.equal(givenCents(order), givenCents(order));

// Many different transactions: every question is well formed, and every wrong choice has safe hints.
let checked = 0;
const itemNames = ["Muffin", "Coffee", "Cookie", "Sandwich", "Tea", "Toast"];
const prices = [100, 150, 175, 200, 250, 300, 450, 500, 650];
for (let i = 0; i < 400; i++) {
  const n = 1 + (i % 4);
  const lines = Array.from({ length: n }, (_, k) =>
    line(
      itemNames[(i + k) % 6],
      prices[(i * 3 + k * 5) % prices.length],
      1 + ((i * 7 + k * 3) % 14),
    ),
  );
  const t = tx(`sale-${i}`, lines, i % 4 === 0 ? "debit" : "cash");
  const qs = [...addQuestions(t), ...(changeQuestion(t) ? [changeQuestion(t)!] : [])];
  if (canAdd(t)) assert.equal(addQuestions(t).at(-1)!.correctCents, t.totalCents);
  if (canChange(t)) assert.ok(changeQuestion(t)!.correctCents > 0);
  for (const q of qs) {
    assert.equal(q.choices.length, 3, "three choices");
    assert.equal(new Set(q.choices).size, 3, "all different");
    assert.ok(q.choices.includes(q.correctCents), "the right answer is one of them");
    assert.ok(
      q.choices.every((c) => c > 0),
      "no zero or negative amounts",
    );
    for (const wrong of q.choices.filter((c) => c !== q.correctCents)) {
      const hints = fallbackHints(q, wrong);
      assert.equal(hints.length, MAX_HINTS);
      for (const h of hints) assert.ok(isGoodHint(h, q), `fallback hint broke a rule: "${h}"`);
      assert.ok(
        ["onePrice", "oneOff", "gaveBack", "cost", "addedBoth", "off"].includes(diagnose(q, wrong)),
      );
    }
    assert.ok(
      isGoodExplanation(fallbackExplanation(q), q),
      `fallback explanation broke a rule for ${q.ask}`,
    );
    checked++;
  }
}

// Hint rules: never the answer, no made-up numbers, short, no jargon.
const q = adds[0]; // $2.50 + $2.50 = ?  (answer $5.00)
assert.equal(isGoodHint("Start with the bigger price. Count up from there.", q), true);
assert.equal(isGoodHint("Start at $2.50. Count up $2.50.", q), true);
assert.equal(isGoodHint("It makes $5.00.", q), false); // says the answer
assert.equal(isGoodHint("Count up 5 dollars.", q), false); // says the answer another way
assert.equal(isGoodHint("Think about $7.25.", q), false); // a number that is not in the question
assert.equal(isGoodHint("Subtract the prices.", q), false); // jargon
assert.equal(isGoodHint("This hint is far too long for anyone to read quickly at all.", q), false);
// Explanations may say the answer, but only with numbers from the question.
assert.equal(isGoodExplanation("Two muffins at $2.50 each make $5.00.", q), true);
assert.equal(isGoodExplanation("That makes $9.00 in total.", q), false);

// The answer spelled out in words is caught too ("five dollars" is this question's answer).
assert.equal(isGoodHint("It makes five dollars.", q), false);
assert.equal(isGoodHint("Start with the bigger price. Count up from there.", q), true);
const changeQ = changeQuestion(
  tx("sale-w", [line("Muffin", 250, 2), line("Coffee", 200, 1, "S")]),
)!;
const words = ["zero","one","two","three","four","five","six","seven","eight","nine","ten"]; // prettier-ignore
if (changeQ.correctCents % 100 === 0 && changeQ.correctCents / 100 <= 10) {
  assert.equal(isGoodHint(`That is ${words[changeQ.correctCents / 100]} dollars.`, changeQ), false);
}
// Explanations use digits only: a spelled-out number cannot be checked.
assert.equal(isGoodExplanation("Two muffins make five dollars.", q), false);
assert.equal(hasNumberWords("Two muffins"), false); // one and two are ordinary words

// Gemini hints that break a rule are replaced one by one.
const merged = mergeHints(
  ["Add both prices.", "It makes $5.00.", "Count up from $2.50."],
  q,
  fallbackHints(q, 250),
);
assert.equal(merged.fromGemini, 2);
assert.equal(merged.hints[1], fallbackHints(q, 250)[1]);
assert.equal(mergeHints(null, q, ["a", "b", "c"]).fromGemini, 0);

console.log(`learn ok (${checked} questions checked)`);
