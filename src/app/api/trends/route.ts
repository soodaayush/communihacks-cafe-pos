import type { NextRequest } from "next/server";
import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockTrends } from "@/lib/mock-data";
import type { TrendPoint } from "@/lib/types";

// GET /api/trends?days=14  ->  quantity sold per menu item per day (UTC), oldest first. days: 1-90.
// Reads the item_daily continuous aggregate, so it stays fast however much history there is.
export function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 14);
  const days = Number.isInteger(raw) ? Math.min(Math.max(raw, 1), 90) : 14;
  return dbOrMock(
    () => mockTrends,
    () =>
      query<TrendPoint>(
        `SELECT to_char(day AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
                menu_item_id AS "menuItemId",
                qty_sold     AS "qtySold"
           FROM item_daily
          WHERE day >= ((now() AT TIME ZONE 'UTC')::date::timestamp AT TIME ZONE 'UTC') - make_interval(days => $1::int - 1)
          ORDER BY day, menu_item_id`,
        [days],
      ),
  );
}
