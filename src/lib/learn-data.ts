// Server-only. The transaction log from Tiger Data, shaped for Learn (read-only: nothing here writes).
// Without DATABASE_URL (local development) it serves a few believable mock transactions instead.
import { HttpError, isUuid } from "./api";
import { hasDb, query } from "./db";
import {
  addQuestions,
  changeQuestion,
  type LearnKind,
  type LearnLine,
  type LearnQuestion,
  type LearnTransaction,
} from "./learn";
import { mockMenu } from "./mock-data";
import { isSize, sizePriceCents } from "./sizes";
import type { DrinkSize, PaymentMethod } from "./types";

// ---------------------------------------------------------------------------------------------
// Real data

interface Row {
  id: string;
  createdAt: Date | string;
  paymentMethod: string;
  totalCents: number;
  lines: {
    menuItemId: string;
    name: string;
    imagePublicId: string | null;
    category: string;
    size: string | null;
    qty: number;
    unitPriceCents: number;
  }[];
}

// One row per sale, with its lines packed into a JSON list (same order every time).
const SELECT = `SELECT s.id,
       s.created_at                   AS "createdAt",
       s.payment_method               AS "paymentMethod",
       s.total_cents::int             AS "totalCents",
       json_agg(json_build_object(
         'menuItemId',     si.menu_item_id,
         'name',           mi.name,
         'imagePublicId',  mi.image_public_id,
         'category',       mi.category,
         'size',           si.size,
         'qty',            si.qty,
         'unitPriceCents', si.unit_price_cents
       ) ORDER BY mi.name, si.size NULLS FIRST) AS lines
  FROM sales s
  JOIN sale_items si ON si.sale_id = s.id AND si.sale_created_at = s.created_at
  JOIN menu_items mi ON mi.id = si.menu_item_id`;

function toTransaction(r: Row): LearnTransaction {
  const lines: LearnLine[] = r.lines.map((l) => ({
    menuItemId: l.menuItemId,
    name: l.name,
    imagePublicId: l.imagePublicId ?? "",
    category: l.category,
    ...(isSize(l.size) ? { size: l.size as DrinkSize } : {}),
    qty: Number(l.qty),
    unitPriceCents: Number(l.unitPriceCents),
  }));
  return {
    id: r.id,
    createdAt: new Date(r.createdAt).toISOString(),
    paymentMethod: (r.paymentMethod === "debit" ? "debit" : "cash") as PaymentMethod,
    totalCents: Number(r.totalCents),
    lines,
  };
}

/** Newest first. Each transaction carries its lines (name, picture, size, qty, unit price). */
export async function getTransactions(limit: number, offset = 0): Promise<LearnTransaction[]> {
  const n = Math.min(Math.max(Math.floor(Number(limit)) || 0, 1), 200);
  const skip = Math.max(Math.floor(Number(offset)) || 0, 0);
  if (!hasDb()) return MOCKS.slice(skip, skip + n);
  const rows = await query<Row>(
    `${SELECT}
 GROUP BY s.id, s.created_at, s.payment_method, s.total_cents
 ORDER BY s.created_at DESC
 LIMIT $1 OFFSET $2`,
    [n, skip],
  );
  return rows.map(toTransaction);
}

/** One transaction by id, or null. */
export async function getTransaction(id: string): Promise<LearnTransaction | null> {
  if (!hasDb()) return MOCKS.find((t) => t.id === id) ?? null;
  if (!isUuid(id)) return null;
  const rows = await query<Row>(
    `${SELECT}
 WHERE s.id = $1
 GROUP BY s.id, s.created_at, s.payment_method, s.total_cents`,
    [id],
  );
  return rows[0] ? toTransaction(rows[0]) : null;
}

// ---------------------------------------------------------------------------------------------
// Shared by the hint and explain routes: turn a request body into the exact question, rebuilt
// from the real transaction, so the browser can never choose prices or answers.

export async function loadLearnQuestion(
  body: Record<string, unknown>,
): Promise<{ tx: LearnTransaction; q: LearnQuestion; kind: LearnKind; step: number }> {
  const id = body.transactionId;
  if (typeof id !== "string" || id.length === 0 || id.length > 64)
    throw new HttpError("transactionId is required");
  const kind = body.kind;
  if (kind !== "add" && kind !== "change") throw new HttpError("kind must be add or change");
  const step = body.step === undefined ? 0 : body.step;
  if (!Number.isInteger(step) || (step as number) < 0 || (step as number) > 20)
    throw new HttpError("step must be a whole number from 0 to 20");

  const tx = await getTransaction(id);
  if (!tx) throw new HttpError("No such transaction", 404);

  const q =
    kind === "add"
      ? addQuestions(tx)[step as number]
      : step === 0
        ? (changeQuestion(tx) ?? undefined)
        : undefined;
  if (!q) throw new HttpError("This transaction has no such question");
  return { tx, q, kind, step: step as number };
}

// ---------------------------------------------------------------------------------------------
// Mock transactions (no database): same menu names and prices as src/lib/mock-data.ts

const item = (name: string) => {
  const m = mockMenu.find((x) => x.name === name);
  if (!m) throw new Error(`mock menu has no ${name}`);
  return m;
};

const line = (name: string, qty: number, size?: DrinkSize): LearnLine => {
  const m = item(name);
  return {
    menuItemId: m.id,
    name: m.name,
    imagePublicId: m.imagePublicId,
    category: m.category,
    ...(size ? { size } : {}),
    qty,
    unitPriceCents: size ? sizePriceCents(m.priceCents, size) : m.priceCents,
  };
};

const BASE = Date.now();
const mock = (
  n: number,
  minutesAgo: number,
  paymentMethod: PaymentMethod,
  lines: LearnLine[],
): LearnTransaction => ({
  id: `mock-${n}`,
  createdAt: new Date(BASE - minutesAgo * 60_000).toISOString(),
  paymentMethod,
  totalCents: lines.reduce((sum, l) => sum + l.qty * l.unitPriceCents, 0),
  lines,
});

// Newest first.
const MOCKS: LearnTransaction[] = [
  mock(1, 4, "cash", [line("Muffin", 2), line("Coffee", 1, "S")]), // 2 muffins and a coffee: $7.00
  mock(2, 11, "debit", [line("Cookie", 1), line("Hot Chocolate", 1, "M")]),
  mock(3, 19, "cash", [line("Cookie", 1)]), // one thing: a single question
  mock(4, 26, "cash", [line("Bagel", 1), line("Coffee", 1, "L")]), // a large drink
  mock(5, 38, "cash", [line("Cookie", 2), line("Sandwich", 1), line("Tea", 1, "S")]), // three lines
  mock(6, 47, "cash", [line("Cookie", 4), line("Muffin", 3)]), // 7 things: grouped by item (4 cookies, then 3 muffins)
  mock(7, 58, "debit", [line("Lemonade", 2, "M")]),
  mock(8, 71, "cash", [line("Muffin", 1), line("Tea", 1, "S")]),
  mock(9, 85, "cash", [line("Sandwich", 1)]),
  mock(10, 102, "debit", [line("Bagel", 2), line("Hot Chocolate", 1, "L")]),
  mock(11, 130, "cash", [line("Coffee", 2, "M")]),
  mock(12, 156, "cash", [line("Muffin", 3)]),
  // Added for the "every sale can be practised" rules (older, so the order above stays the same):
  mock(13, 170, "cash", [line("Muffin", 12), line("Coffee", 1, "L")]), // a big order: 12 muffins counted up, then added to a coffee
  mock(14, 185, "cash", [
    line("Muffin", 4),
    line("Cookie", 6),
    line("Tea", 3, "S"),
    line("Coffee", 5, "M"),
  ]), // 18 items, 4 lines
  mock(15, 200, "debit", [line("Cookie", 1)]), // one thing, paid by card: a single question; change is pretend cash
  mock(16, 215, "debit", [line("Muffin", 1), line("Tea", 1, "S"), line("Cookie", 1)]), // 3 things, paid by card
];

// Hint safety for numbers written as words lives with the other hint rules in src/lib/learn.ts.
export { hasNumberWords, saysAnswerInWords } from "./learn";
