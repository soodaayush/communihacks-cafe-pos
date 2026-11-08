// Server-only. Monthly budget with balances that carry forward: each month starts with what the
// month before ended with. Built from the same sales and expenses as the rest of the Money screen.
import { getDaySummaries, getExpenses } from "./money-data";
import type { Expense, ExpenseType } from "./types";

// shortcut: assumed cash on hand when the records start; store it once someone owns the books.
export const STARTING_BALANCE_CENTS = 100_000;

export const BILL_LABEL: Record<ExpenseType, string> = {
  rent: "Rent",
  salary: "Wages",
  inventory: "Buying stock",
  other: "Other",
};

// One fixed colour per bill (never cycled): muted pastels to match the app. Checked with the
// dataviz palette validator in the order rent, wages, other, stock: every neighbour is easy to tell
// apart, colour-blind too. They are softer than its chroma floor and under 3:1 on white on purpose,
// so every chart prints the amount next to each colour and never relies on colour alone.
export const BILL_COLOR: Record<ExpenseType, string> = {
  rent: "#7fa8d0",
  salary: "#d9a957",
  other: "#b59ad6",
  inventory: "#7fb893",
};

export interface BudgetMonth {
  month: string; // YYYY-MM
  /** Sales per day of the month: index 0 = the 1st. Feeds the "at this pace" line. */
  dailyInCents: number[];
  openingCents: number; // carried over from the month before
  inCents: number; // sales
  outCents: number; // all bills, including buying stock
  closingCents: number; // opening + in - out, carried into the next month
  spentCents: Record<ExpenseType, number>;
  /** The plan for each bill = what was spent on it the month before (null for the first month). */
  planCents: Record<ExpenseType, number> | null;
}

/** Oldest month first. Each month's opening is the previous month's closing. */
export function buildMonths(
  days: { date: string; moneyInCents: number }[],
  expenses: Expense[],
  startCents: number,
): BudgetMonth[] {
  const months = new Map<string, BudgetMonth>();
  const monthOf = (date: string) => {
    const key = date.slice(0, 7);
    let m = months.get(key);
    if (!m) {
      m = {
        month: key,
        dailyInCents: [],
        openingCents: 0,
        inCents: 0,
        outCents: 0,
        closingCents: 0,
        spentCents: { rent: 0, salary: 0, inventory: 0, other: 0 },
        planCents: null,
      };
      months.set(key, m);
    }
    return m;
  };
  for (const d of days) {
    const m = monthOf(d.date);
    m.inCents += d.moneyInCents;
    const i = Number(d.date.slice(8, 10)) - 1;
    m.dailyInCents[i] = (m.dailyInCents[i] ?? 0) + d.moneyInCents;
  }
  for (const e of expenses) {
    const m = monthOf(e.date);
    m.outCents += e.amountCents;
    m.spentCents[e.type] += e.amountCents;
  }

  let carry = startCents;
  let lastSpent: BudgetMonth["spentCents"] | null = null;
  return [...months.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => {
      const closingCents = carry + m.inCents - m.outCents;
      const row = { ...m, openingCents: carry, closingCents, planCents: lastSpent };
      carry = closingCents;
      lastSpent = m.spentCents;
      return row;
    });
}

/** This month plus `monthsBack` full months before it, oldest first. */
export async function getBudgetMonths(monthsBack = 2): Promise<BudgetMonth[]> {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, 1);
  const days = Math.round((todayUtc - start) / 86_400_000) + 1;
  const [summaries, expenses] = await Promise.all([getDaySummaries(days), getExpenses(days)]);
  return buildMonths(summaries, expenses, STARTING_BALANCE_CENTS);
}

/**
 * Break-even for one month, in cents. The bills it needs to cover = last month's real bills
 * (its plan), or this month's bills so far if they already cost more.
 */
export function billsCover(m: BudgetMonth) {
  const planned = m.planCents ? Object.values(m.planCents).reduce((a, b) => a + b, 0) : 0;
  const needCents = Math.max(planned, m.outCents);
  return {
    needCents,
    toGoCents: Math.max(0, needCents - m.inCents),
    extraCents: Math.max(0, m.inCents - needCents),
  };
}

/**
 * Simple forecast for the current month at the pace so far. `today` is the day of the month
 * (1-31, counted as a day with sales). `coverDay` = the day the running total reaches the bills,
 * or null if it won't this month.
 */
export function forecastMonth(m: BudgetMonth, today: number, daysInMonth: number) {
  const paceCents = today > 0 ? m.inCents / today : 0;
  const projectedCents = Math.round(m.inCents + paceCents * (daysInMonth - today));
  const { needCents } = billsCover(m);
  const day = paceCents > 0 ? Math.ceil(needCents / paceCents) : Infinity;
  return {
    paceCents: Math.round(paceCents),
    projectedCents,
    coverDay: day <= daysInMonth ? Math.max(day, 1) : null,
  };
}

/** Whole dollars, like the rest of the Money screen: fewer digits to read. */
export const dollars = (cents: number): string =>
  `${cents < 0 ? "−" : ""}$${Math.round(Math.abs(cents) / 100).toLocaleString("en-CA")}`;

/** "2026-11" -> "November" */
export const monthName = (month: string): string =>
  new Date(`${month}-01T00:00:00Z`).toLocaleString("en-CA", { month: "long", timeZone: "UTC" });
