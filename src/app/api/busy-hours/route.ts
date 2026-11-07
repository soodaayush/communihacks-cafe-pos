import type { NextRequest } from "next/server";
import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockBusyHours } from "@/lib/mock-data";
import type { BusyHour } from "@/lib/types";

// GET /api/busy-hours?days=14  ->  sales grouped by hour of the day (UTC), all 24 hours, days: 1-90.
// Built on the sales_hourly continuous aggregate.
export function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 14);
  const days = Number.isInteger(raw) ? Math.min(Math.max(raw, 1), 90) : 14;
  return dbOrMock(
    () => mockBusyHours,
    () =>
      query<BusyHour>(
        `SELECT h AS hour,
                coalesce(sum(s.sale_count), 0)::int      AS "saleCount",
                coalesce(sum(s.money_in_cents), 0)::int  AS "moneyInCents"
           FROM generate_series(0, 23) AS h
           LEFT JOIN sales_hourly s
                  ON extract(hour FROM s.hour AT TIME ZONE 'UTC') = h
                 AND s.hour >= now() - make_interval(days => $1::int)
          GROUP BY h
          ORDER BY h`,
        [days],
      ),
  );
}
