import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockExpenses } from "@/lib/mock-data";
import type { Expense } from "@/lib/types";

export function GET() {
  return dbOrMock(
    () => mockExpenses,
    () =>
      query<Expense>(
        `SELECT id, type, amount_cents AS "amountCents", to_char(date, 'YYYY-MM-DD') AS date
           FROM expenses
          ORDER BY date DESC, type`,
      ),
  );
}
