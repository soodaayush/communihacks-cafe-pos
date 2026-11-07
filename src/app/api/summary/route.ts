import type { NextRequest } from "next/server";
import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockSummary } from "@/lib/mock-data";
import type { DaySummary, SummaryRange } from "@/lib/types";

const RANGES: SummaryRange[] = ["day", "week", "month"];
const DAYS: Record<SummaryRange, number> = { day: 1, week: 7, month: 30 };

// GET /api/summary?range=day|week|month  ->  DaySummary[] (one per day, newest first)
//   moneyIn  = sales taken that day
//   moneyOut = expenses that day (restocks are logged as "inventory" expenses, so they are included)
//   left     = moneyIn - moneyOut            (cash position)
//   profit   = sales - cost of what was sold - non-inventory expenses
//              (inventory spend is already counted through the cost of goods sold)
// Days are UTC calendar days. Days with no activity still appear, as zeros.
export function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ?? "day") as SummaryRange;
  if (!RANGES.includes(range)) {
    return Response.json({ error: "range must be day, week or month" }, { status: 400 });
  }
  return dbOrMock(
    () => mockSummary(range),
    () =>
      query<DaySummary>(
        `WITH days AS (
           SELECT d::date AS day
             FROM generate_series((now() AT TIME ZONE 'UTC')::date - ($1::int - 1),
                                  (now() AT TIME ZONE 'UTC')::date, interval '1 day') AS d
         ),
         sold AS (
           SELECT (s.created_at AT TIME ZONE 'UTC')::date AS day,
                  sum(s.total_cents)::int AS money_in
             FROM sales s
            WHERE s.created_at >= (now() AT TIME ZONE 'UTC')::date - ($1::int - 1)
            GROUP BY 1
         ),
         margin AS (
           SELECT (si.sale_created_at AT TIME ZONE 'UTC')::date AS day,
                  sum(si.qty * si.unit_cost_cents)::int AS cogs
             FROM sale_items si
            WHERE si.sale_created_at >= (now() AT TIME ZONE 'UTC')::date - ($1::int - 1)
            GROUP BY 1
         ),
         spent AS (
           SELECT date AS day,
                  sum(amount_cents)::int AS money_out,
                  sum(amount_cents) FILTER (WHERE type <> 'inventory')::int AS overhead
             FROM expenses
            WHERE date >= (now() AT TIME ZONE 'UTC')::date - ($1::int - 1)
            GROUP BY 1
         )
         SELECT to_char(days.day, 'YYYY-MM-DD')                                AS date,
                coalesce(sold.money_in, 0)                                     AS "moneyInCents",
                coalesce(spent.money_out, 0)                                   AS "moneyOutCents",
                coalesce(sold.money_in, 0) - coalesce(spent.money_out, 0)      AS "leftCents",
                coalesce(sold.money_in, 0) - coalesce(margin.cogs, 0)
                  - coalesce(spent.overhead, 0)                                AS "profitCents"
           FROM days
           LEFT JOIN sold   USING (day)
           LEFT JOIN margin USING (day)
           LEFT JOIN spent  USING (day)
          ORDER BY days.day DESC`,
        [DAYS[range]],
      ),
  );
}
