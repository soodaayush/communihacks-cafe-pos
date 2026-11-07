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

export interface BudgetMonth {
  month: string; // YYYY-MM
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
  for (const d of days) monthOf(d.date).inCents += d.moneyInCents;
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

/** "2026-11" -> "November" */
export const monthName = (month: string): string =>
  new Date(`${month}-01T00:00:00Z`).toLocaleString("en-CA", { month: "long", timeZone: "UTC" });
