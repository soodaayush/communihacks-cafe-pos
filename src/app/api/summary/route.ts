import type { NextRequest } from "next/server";
import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockSummary } from "@/lib/mock-data";
import type { DaySummary, SummaryRange } from "@/lib/types";

const RANGES: SummaryRange[] = ["day", "week", "month"];
const DAYS: Record<SummaryRange, number> = { day: 1, week: 7, month: 30 };

// GET /api/summary?range=day|week|month  ->  DaySummary[] (one per day, newest first)
//   moneyIn  = sales taken that day            (sales_daily continuous aggregate)
//   moneyOut = expenses that day               (restocks are logged as "inventory" expenses)
//   left     = moneyIn - moneyOut              (cash position)
//   profit   = sales - cost of what was sold - non-inventory expenses
//              (inventory spend is already counted through the cost of goods sold: item_daily)
// time_bucket_gapfill makes sure days with no sales still appear, as zeros. Days are UTC.
export function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ?? "day") as SummaryRange;
  if (!RANGES.includes(range)) {
    return Response.json({ error: "range must be day, week or month" }, { status: 400 });
  }
  // Window = the last N UTC days, ending after today. Passed explicitly: gapfill cannot infer
  // its bounds through a real-time continuous aggregate.
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() + 1);
  const start = new Date(end.getTime() - DAYS[range] * 86_400_000);
  return dbOrMock(
    () => mockSummary(range),
    () =>
      query<DaySummary>(
        `WITH sold AS (
           SELECT time_bucket_gapfill(interval '1 day', day, $1::timestamptz, $2::timestamptz) AS day,
                  coalesce(sum(money_in_cents), 0)::int AS money_in
             FROM sales_daily
            WHERE day >= $1::timestamptz AND day < $2::timestamptz
            GROUP BY 1
         ),
         margin AS (
           SELECT time_bucket_gapfill(interval '1 day', day, $1::timestamptz, $2::timestamptz) AS day,
                  coalesce(sum(cogs_cents), 0)::int AS cogs
             FROM item_daily
            WHERE day >= $1::timestamptz AND day < $2::timestamptz
            GROUP BY 1
         ),
         spent AS (
           SELECT date AS day,
                  sum(amount_cents)::int AS money_out,
                  sum(amount_cents) FILTER (WHERE type <> 'inventory')::int AS overhead
             FROM expenses
            WHERE date >= ($1::timestamptz AT TIME ZONE 'UTC')::date
            GROUP BY 1
         )
         SELECT to_char(sold.day AT TIME ZONE 'UTC', 'YYYY-MM-DD')               AS date,
                sold.money_in                                                     AS "moneyInCents",
                coalesce(spent.money_out, 0)                                      AS "moneyOutCents",
                sold.money_in - coalesce(spent.money_out, 0)                      AS "leftCents",
                sold.money_in - margin.cogs - coalesce(spent.overhead, 0)         AS "profitCents"
           FROM sold
           JOIN margin USING (day)
           LEFT JOIN spent ON spent.day = (sold.day AT TIME ZONE 'UTC')::date
          ORDER BY sold.day DESC`,
        [start.toISOString(), end.toISOString()],
      ),
  );
}
