// Learn: practise the arithmetic of real transactions. Pure code, no UI and no Gemini.
//   add    "2 muffins and a coffee": add the prices one at a time to see why they make the total
//   change "they gave $10 for a $6.75 order": work out the change
// This file decides what is RIGHT and what a hint may say. Gemini only words hints (see
// src/lib/integrations/gemini.ts), and every hint is checked here before anyone sees it.
import { roundCash } from "./cash";
import { formatCents } from "./money";
import { sizeLabel } from "./sizes";
import type { DrinkSize, PaymentMethod } from "./types";

export interface LearnLine {
  menuItemId: string;
  name: string;
  imagePublicId: string;
  category: string;
  size?: DrinkSize;
  qty: number;
  unitPriceCents: number;
}

export interface LearnTransaction {
  id: string;
  createdAt: string; // ISO 8601
  paymentMethod: PaymentMethod;
  totalCents: number;
  lines: LearnLine[];
}

export type LearnKind = "add" | "change";
/**
 * What a question asks:
 *   plus    two amounts put together ("$2.50 + $3.00")
 *   times   several of the same thing ("10 muffins at $2.50 each"), counted up by the price
 *   single  a sale of one thing: read the total
 *   change  they gave more than it costs: how much comes back
 */
export type LearnOp = "plus" | "times" | "single" | "change";
export const MAX_HINTS = 3;
// Up to this many things are added one by one. More than that is grouped by item, so ten muffins
// are one question, not ten "$2.50 + $2.50".
const MAX_UNIT_PIECES = 4;
const MAX_HINT_WORDS = 12;

// ---------------------------------------------------------------------------------------------
// Describing a transaction

/** "Large coffee", "Muffin". */
export const lineLabel = (l: Pick<LearnLine, "name" | "size">): string =>
  l.size ? `${sizeLabel(l.size)} ${l.name.toLowerCase()}` : l.name;

const plural = (word: string, n: number): string =>
  n === 1 ? word : /(s|x|ch|sh)$/i.test(word) ? `${word}es` : `${word}s`;

/** "2 muffins, 1 small coffee": words for reading aloud and for the text Gemini sees. */
export function describeTransaction(tx: LearnTransaction): string {
  return tx.lines.map((l) => `${l.qty} ${plural(lineLabel(l).toLowerCase(), l.qty)}`).join(", ");
}

export interface LearnUnit {
  label: string;
  name: string;
  imagePublicId: string;
  priceCents: number;
}

/** Every single thing sold, one by one: "2 muffins and a coffee" is three units. */
export function units(tx: LearnTransaction): LearnUnit[] {
  return tx.lines.flatMap((l) =>
    Array.from({ length: l.qty }, () => ({
      label: lineLabel(l),
      name: l.name,
      imagePublicId: l.imagePublicId,
      priceCents: l.unitPriceCents,
    })),
  );
}

/** Every sale can be practised: one thing, a few things, or a big order grouped by item. */
export const canAdd = (tx: LearnTransaction): boolean => {
  const u = units(tx);
  return u.length >= 1 && u.reduce((sum, x) => sum + x.priceCents, 0) === tx.totalCents;
};

/** Every sale can be practised. A card sale has no change to give, so the game says "pretend they paid cash". */
export const canChange = (tx: LearnTransaction): boolean => roundCash(tx.totalCents) > 0;

// ---------------------------------------------------------------------------------------------
// Deterministic helpers: the same transaction always gives the same practice, on the server and
// in the browser.

function seedFrom(text: string): number {
  return [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
}
function seededShuffle<T>(xs: T[], seedText: string): T[] {
  let seed = seedFrom(seedText);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const BILLS = [500, 1000, 2000, 5000, 10000];

/**
 * What the customer handed over for a cash sale. The database only stores the total, so this is a
 * realistic amount worked out from the sale: the next dollar, or one of the next two bills.
 * Always more than the total, always a multiple of 5 cents.
 */
export function givenCents(tx: LearnTransaction): number {
  const due = roundCash(tx.totalCents);
  const nextDollar = Math.ceil((due + 1) / 100) * 100;
  const pool = [...new Set([nextDollar, ...BILLS.filter((b) => b > due).slice(0, 2)])].filter(
    (g) => g > due,
  );
  return pool[seedFrom(tx.id) % pool.length];
}

// ---------------------------------------------------------------------------------------------
// Questions

export interface LearnQuestion {
  kind: LearnKind;
  op: LearnOp;
  step: number; // 0-based, across all the questions of this practice
  steps: number; // how many questions this practice has
  /** Spoken: "$2.50 + $2.50 = ?", "How much for 10 muffins at $2.50 each?", "How much change?" */
  ask: string;
  /**
   * plus: the two amounts. times: leftCents is the price of one (rightCents is 0).
   * single: leftCents is the price. change: leftCents is what they gave, rightCents the cost.
   */
  leftCents: number;
  rightCents: number;
  leftLabel: string;
  rightLabel: string;
  /** Picture ids for each side (image public ids): what is being added, or what was bought. */
  leftImages: string[];
  rightImages: string[];
  /** times: how many there are (spoken: "10 muffins"), and what one costs. */
  itemsSpoken?: string;
  count?: number;
  unitCents?: number;
  /** change on a card sale: the game asks them to pretend the customer paid cash. */
  pretend?: boolean;
  /** Three different amounts, one of them right. In the order to show them. */
  choices: number[];
  correctCents: number;
  /** Plain facts for Gemini, so hints fit this exact question. */
  facts: string;
  /** The method the hints teach. */
  method: string;
}

function makeChoices(correct: number, extras: number[], seedText: string): number[] {
  const wrong = [...new Set(extras)].filter((c) => c > 0 && c !== correct && c % 5 === 0);
  const picked = seededShuffle(wrong, `w:${seedText}`).slice(0, 2);
  return seededShuffle([correct, ...picked], `c:${seedText}`);
}

/** One thing to put together: a single item, or (in a big order) all of one item. */
export interface LearnPiece {
  /** On screen, short: "Muffin", "Muffin × 10". */
  label: string;
  /** Spoken and sent to Gemini: "muffin", "10 muffins". */
  spoken: string;
  cents: number;
  imagePublicId: string;
  count: number; // how many things this piece is made of
  unitCents: number; // what one costs
}

/**
 * The pieces to add up. A small order is added thing by thing ("muffin + muffin + coffee"); a big
 * order is added item by item ("10 muffins + 3 coffees"), so nobody adds 1 + 1 ten times.
 */
export function pieces(tx: LearnTransaction): LearnPiece[] {
  const u = units(tx);
  if (u.length <= MAX_UNIT_PIECES) {
    return u.map((x) => ({
      label: x.label,
      spoken: x.label.toLowerCase(),
      cents: x.priceCents,
      imagePublicId: x.imagePublicId,
      count: 1,
      unitCents: x.priceCents,
    }));
  }
  return tx.lines.map((l) => ({
    label: l.qty > 1 ? `${lineLabel(l)} × ${l.qty}` : lineLabel(l),
    spoken:
      l.qty > 1
        ? `${l.qty} ${plural(lineLabel(l).toLowerCase(), l.qty)}`
        : lineLabel(l).toLowerCase(),
    cents: l.qty * l.unitPriceCents,
    imagePublicId: l.imagePublicId,
    count: l.qty,
    unitCents: l.unitPriceCents,
  }));
}

/**
 * What was added, for the finished screen: "Muffin × 10", "Large coffee". The same thing bought
 * several times is written once with its count, never "Muffin + Muffin + Muffin + …".
 */
export function chainLabels(tx: LearnTransaction): string[] {
  const out: { label: string; cents: number; n: number }[] = [];
  for (const p of pieces(tx)) {
    const last = out[out.length - 1];
    if (last && last.label === p.label && last.cents === p.cents) last.n++;
    else out.push({ label: p.label, cents: p.cents, n: 1 });
  }
  return out.map((o) => (o.n > 1 ? `${o.label} × ${o.n}` : o.label));
}

type Draft = Omit<LearnQuestion, "step" | "steps">;

/** "10 muffins at $2.50 each": count up by the price once for each one. */
function timesQuestion(tx: LearnTransaction, p: LearnPiece): Draft {
  const unit = p.unitCents;
  const correct = unit * p.count;
  // The first two counts help; they are never the answer (needs three or more).
  const skip = p.count >= 3 ? `${formatCents(unit)}, ${formatCents(unit * 2)}` : "";
  return {
    kind: "add",
    op: "times",
    ask: `How much for ${p.spoken} at ${formatCents(unit)} each?`,
    leftCents: unit,
    rightCents: 0,
    leftLabel: "Each",
    rightLabel: p.label,
    leftImages: [p.imagePublicId],
    rightImages: [p.imagePublicId],
    count: p.count,
    unitCents: unit,
    correctCents: correct,
    // slips: the price of just one, one too many or too few, the count taken as dollars
    choices: makeChoices(
      correct,
      [
        correct + unit,
        correct - unit,
        unit,
        correct + 100,
        correct - 100,
        p.count * 100 + unit,
        correct + 50,
      ],
      `${tx.id}:t:${p.label}`,
    ),
    itemsSpoken: p.spoken,
    facts: `A customer bought ${describeTransaction(tx)}. How much for ${p.spoken} at ${formatCents(unit)} each?${skip ? ` Counting by ${formatCents(unit)} goes ${skip}.` : ""}`,
    method: "skip count: count up by the price of one, once for each one",
  };
}

/** A sale of one thing: the total is its price. */
function singleQuestion(tx: LearnTransaction, p: LearnPiece): Draft {
  return {
    kind: "add",
    op: "single",
    ask: "How much is the total?",
    leftCents: p.cents,
    rightCents: 0,
    leftLabel: p.label,
    rightLabel: "",
    leftImages: [p.imagePublicId],
    rightImages: [],
    correctCents: p.cents,
    choices: makeChoices(
      p.cents,
      [p.cents + 50, p.cents - 50, p.cents + 100, p.cents - 100, p.cents + 25, p.cents - 25],
      `${tx.id}:s`,
    ),
    facts: `A customer bought ${describeTransaction(tx)}. It is one thing, so the total is the price of that one thing.`,
    method: "read the price of the one thing: it is the total",
  };
}

/**
 * Every sale has an adding practice:
 *   a group of the same thing first ("10 muffins at $2.50 each", counted up by the price),
 *   then the pieces put together two at a time, ending exactly at the sale's total,
 *   or, for a sale of one thing, one question that reads the total.
 */
export function addQuestions(tx: LearnTransaction): LearnQuestion[] {
  if (!canAdd(tx)) return [];
  const ps = pieces(tx);
  const out: Draft[] = [];

  for (const p of ps) if (p.count > 1) out.push(timesQuestion(tx, p));

  let running = ps[0].cents;
  for (let i = 1; i < ps.length; i++) {
    const left = running;
    const right = ps[i].cents;
    const correct = left + right;
    const sofar = [...new Set(ps.slice(0, i).map((p) => p.imagePublicId))].slice(-3);
    out.push({
      kind: "add",
      op: "plus",
      ask: `${formatCents(left)} + ${formatCents(right)} = ?`,
      leftCents: left,
      rightCents: right,
      leftLabel: i === 1 ? ps[0].label : "So far",
      rightLabel: ps[i].label,
      leftImages: sofar,
      rightImages: [ps[i].imagePublicId],
      correctCents: correct,
      // slips: one of the two prices alone, off by a coin or a dollar
      choices: makeChoices(
        correct,
        [left, right, correct + 100, correct - 100, correct + 50, correct - 50, correct + 25],
        `${tx.id}:${i}`,
      ),
      facts: `A customer bought ${describeTransaction(tx)}. Step ${i} of ${ps.length - 1}: add ${formatCents(left)} (${i === 1 ? ps[0].spoken : "the total so far"}) and ${formatCents(right)} (${ps[i].spoken}).`,
      method: "count on: start with the bigger price and count up by the other",
    });
    running = correct;
  }

  if (out.length === 0) out.push(singleQuestion(tx, ps[0]));
  return out.map((q, i) => ({ ...q, step: i, steps: out.length }));
}

/** "They gave $10.00. It costs $6.75. How much change?" (on a card sale: pretend they paid cash) */
export function changeQuestion(tx: LearnTransaction): LearnQuestion | null {
  if (!canChange(tx)) return null;
  const due = roundCash(tx.totalCents);
  const given = givenCents(tx);
  const correct = given - due;
  const pretend = tx.paymentMethod !== "cash";
  return {
    kind: "change",
    op: "change",
    step: 0,
    steps: 1,
    ask: "How much change?",
    leftCents: given,
    rightCents: due,
    leftLabel: "They gave",
    rightLabel: "It costs",
    leftImages: [],
    rightImages: [...new Set(tx.lines.map((l) => l.imagePublicId))].slice(0, 3),
    pretend,
    correctCents: correct,
    // slips: the amount given, the cost, the two added together, off by a dollar or a coin
    choices: makeChoices(
      correct,
      [
        given,
        due,
        given + due,
        correct + 100,
        correct - 100,
        correct + 25,
        correct - 25,
        correct + 50,
      ],
      `${tx.id}:change`,
    ),
    facts: `A customer ${pretend ? "paid by card" : "paid cash"} for ${describeTransaction(tx)}.${pretend ? " Pretend they paid cash instead." : ""} It costs ${formatCents(due)}. They gave ${formatCents(given)}. The cashier must give back the change.`,
    method: "count up from the cost to what they gave, the next dollar first",
  };
}

// ---------------------------------------------------------------------------------------------
// What went wrong, in plain words (used to word the first hint, and told to Gemini)

export type Slip = "onePrice" | "oneOff" | "gaveBack" | "cost" | "addedBoth" | "off";

export function diagnose(q: LearnQuestion, wrongCents: number): Slip {
  if (q.op === "plus") {
    return wrongCents === q.leftCents || wrongCents === q.rightCents ? "onePrice" : "off";
  }
  if (q.op === "times") {
    const unit = q.unitCents ?? 0;
    if (wrongCents === unit) return "onePrice"; // the price of just one
    if (Math.abs(wrongCents - q.correctCents) === unit) return "oneOff"; // one too many or too few
    return "off";
  }
  if (q.op === "change") {
    if (wrongCents === q.leftCents) return "gaveBack"; // picked what they gave
    if (wrongCents === q.rightCents) return "cost"; // picked the cost
    if (wrongCents === q.leftCents + q.rightCents) return "addedBoth";
  }
  return "off";
}

export const slipSentence = (q: LearnQuestion, wrongCents: number): string => {
  const s = diagnose(q, wrongCents);
  const w = formatCents(wrongCents);
  if (s === "onePrice") {
    return q.op === "times"
      ? `They picked ${w}, which is the price of just one.`
      : `They picked ${w}, which is only one of the two prices.`;
  }
  if (s === "oneOff") return `They picked ${w}, which is one item too many or too few.`;
  if (s === "gaveBack")
    return `They picked ${w}, which is the money the customer gave, not the change.`;
  if (s === "cost") return `They picked ${w}, which is the cost, not the change.`;
  if (s === "addedBoth")
    return `They added the cost and the money given instead of finding the difference.`;
  return `They picked ${w}, which is not right.`;
};

// ---------------------------------------------------------------------------------------------
// Hints: they teach the method (count on / count up) and never say the answer

const moneyWords = (cents: number) => formatCents(cents);

/** Three fixed hints, each helping a bit more. Used when Gemini is unavailable or breaks a rule. */
export function fallbackHints(q: LearnQuestion, wrongCents: number): string[] {
  const slip = diagnose(q, wrongCents);
  let hints: string[];
  if (q.op === "plus") {
    const big = Math.max(q.leftCents, q.rightCents);
    const small = Math.min(q.leftCents, q.rightCents);
    hints = [
      slip === "onePrice"
        ? "That is only one of the prices. Add both."
        : "Put the two prices together.",
      "Start with the bigger price. Count up from there.",
      `Start at ${moneyWords(big)}. Count up ${moneyWords(small)}.`,
    ];
  } else if (q.op === "times") {
    const unit = q.unitCents ?? 0;
    hints = [
      slip === "onePrice"
        ? "That is only one. Count every one."
        : slip === "oneOff"
          ? "So close. Count them one by one."
          : "Each one costs the same. Add it each time.",
      "Count up by the price, once for each one.",
      (q.count ?? 0) >= 3
        ? `Count by ${moneyWords(unit)}: ${moneyWords(unit)}, ${moneyWords(unit * 2)}. Keep going.`
        : `Count by ${moneyWords(unit)}. Do it two times.`,
    ];
  } else if (q.op === "single") {
    hints = [
      "There is only one thing.",
      "Look at the price on the tile.",
      "The total is that price.",
    ];
  } else {
    hints = [
      slip === "gaveBack"
        ? "That is what they gave. Change is what they get back."
        : slip === "cost"
          ? "That is the cost. Change is what is left over."
          : slip === "addedBoth"
            ? "Change is less than what they gave."
            : "Start at the cost. Count up to what they gave.",
      "Count up to the next dollar first.",
      `Start at ${moneyWords(q.rightCents)}. Count up to ${moneyWords(q.leftCents)}.`,
    ];
  }
  // A hint that would give the answer away (e.g. the cost equals the change) becomes a safe one.
  const safe = [
    "Count up a little at a time.",
    "Use the pictures to count up.",
    "Take it one step at a time.",
  ];
  return hints.map((h, i) => (isGoodHint(h, q) ? h : safe[i]));
}

const JARGON =
  /\b(profit|revenue|margin|expenses?|percent|inventory|equation|calculat\w*|subtract\w*|minus)\b|%/i;

/** Every number written in `text`, as a plain number: "$2.50" -> 2.5, "3 dollars" -> 3. */
function numbersIn(text: string): number[] {
  return (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => Number(n.replace(/,/g, "")));
}

/** Numbers a hint may use: the ones in the question's own facts. */
function allowedNumbers(q: LearnQuestion): Set<number> {
  return new Set(numbersIn(q.facts));
}

/** The right answer, written as dollars or cents, in any common way. */
function mentionsAnswer(text: string, q: LearnQuestion): boolean {
  const c = q.correctCents;
  const answerNumbers = new Set<number>([c / 100]);
  if (c < 100) answerNumbers.add(c); // "25 cents"
  return numbersIn(text).some((n) => answerNumbers.has(n));
}

/** A hint is allowed only if it is short, has no hard words, no made-up numbers, and does not say the answer. */
export function isGoodHint(text: string, q: LearnQuestion): boolean {
  const t = text.trim();
  if (!t || t.split(/\s+/).length > MAX_HINT_WORDS || JARGON.test(t)) return false;
  if (mentionsAnswer(t, q) || saysAnswerInWords(t, q)) return false;
  const allowed = allowedNumbers(q);
  return numbersIn(t).every((n) => allowed.has(n));
}

/** Use Gemini's hints where they pass; fill any gap with the fixed hint for that step. */
export function mergeHints(
  candidate: string[] | null,
  q: LearnQuestion,
  fallback: string[],
): { hints: string[]; fromGemini: number } {
  const hints: string[] = [];
  let fromGemini = 0;
  for (let i = 0; i < MAX_HINTS; i++) {
    const c = candidate?.[i]?.trim();
    if (c && isGoodHint(c, q)) {
      hints.push(c);
      fromGemini++;
    } else {
      hints.push(fallback[i] ?? fallback[fallback.length - 1]);
    }
  }
  return { hints, fromGemini };
}

// ---------------------------------------------------------------------------------------------
// The explanation shown after the right answer ("why")

export function fallbackExplanation(q: LearnQuestion): string {
  if (q.op === "times") {
    return `${q.itemsSpoken ?? "They"} at ${formatCents(q.unitCents ?? 0)} each make ${formatCents(q.correctCents)}.`;
  }
  if (q.op === "single") {
    return `It is one thing, so the total is ${formatCents(q.correctCents)}.`;
  }
  return q.op === "plus"
    ? `${formatCents(q.leftCents)} and ${formatCents(q.rightCents)} together make ${formatCents(q.correctCents)}.`
    : `They gave ${formatCents(q.leftCents)} and it costs ${formatCents(q.rightCents)}. Count up: the change is ${formatCents(q.correctCents)}.`;
}

/** An explanation may say the answer, but only with numbers from the question or the answer itself. */
export function isGoodExplanation(text: string, q: LearnQuestion): boolean {
  const t = text.trim();
  // A number spelled out cannot be checked against the question, so explanations use digits.
  if (!t || t.split(/\s+/).length > 28 || JARGON.test(t) || hasNumberWords(t)) return false;
  const allowed = allowedNumbers(q);
  allowed.add(q.correctCents / 100);
  if (q.correctCents < 100) allowed.add(q.correctCents);
  return numbersIn(t).every((n) => allowed.has(n));
}

// ---------------------------------------------------------------------------------------------
// Numbers written as words. The checks above only read digits, so "it makes nine dollars" would
// pass them; these catch the same thing spelled out.

// ---------------------------------------------------------------------------------------------
// Hint safety for numbers written as words. isGoodHint (src/lib/learn.ts) only sees digits, so
// "it makes nine dollars" would pass. The hint route rejects a hint that spells out the answer.

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
]; // prettier-ignore
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** A regex source for n in words: 25 -> "twenty[- ]five". Null above 999. */
function wordsPattern(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 999) return null;
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `[- ]${ONES[n % 10]}` : "");
  const rest = n % 100;
  const h = Math.floor(n / 100);
  return (
    `${h === 1 ? "(?:one|a)" : ONES[h]} hundred` + (rest ? `(?: and)? ${wordsPattern(rest)}` : "")
  );
}

/** True if `text` contains a number written as a word (three and up). Used on explanations, where
 * the shared check only reads digits: a wrong "sixteen dollars" would otherwise pass. */
export function hasNumberWords(text: string): boolean {
  return /\b(?:three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/i.test(
    text,
  );
}

/** True if `text` says the right answer in words ("six dollars", "fifty cents", "three twenty-five"). */
export function saysAnswerInWords(text: string, q: Pick<LearnQuestion, "correctCents">): boolean {
  const dollars = Math.floor(q.correctCents / 100);
  const cents = q.correctCents % 100;
  const d = wordsPattern(dollars);
  const c = wordsPattern(cents);
  const patterns: string[] = [];
  if (cents === 0 && d) {
    patterns.push(`\\b${d}\\s+(?:dollars?|bucks)\\b`);
    if (dollars >= 3) patterns.push(`\\b${d}\\b`); // "one"/"two" are ordinary words: only banned with "dollars"
  } else if (dollars === 0 && c) {
    // "fifty" alone is the answer; "five fifty" is a bigger amount (the cost), so it is allowed.
    patterns.push(
      `\\b${c}\\s+cents?\\b`,
      `(?<!\\b(?:${ONES.slice(1, 13).join("|")})\\s)\\b${c}\\b`,
    );
  } else if (d && c) {
    patterns.push(
      `\\b${d}\\b[\\s,]*(?:dollars?|bucks)?[\\s,]*(?:and )?${c}\\b`,
      `\\b${c}\\s+cents?\\b`,
    );
  }
  return patterns.some((p) => new RegExp(p, "i").test(text));
}
