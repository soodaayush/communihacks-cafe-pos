import type { NextRequest } from "next/server";
import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockTrends } from "@/lib/mock-data";
import type { TrendPoint } from "@/lib/types";

// GET /api/trends?days=14  ->  quantity sold per menu item per day (UTC), oldest first. days: 1-90.
export function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 14);
  const days = Number.isInteger(raw) ? Math.min(Math.max(raw, 1), 90) : 14;
  return dbOrMock(
    () => mockTrends,
    () =>
      query<TrendPoint>(
        `SELECT to_char(time_bucket(interval '1 day', sale_created_at, 'UTC'), 'YYYY-MM-DD') AS date,
                menu_item_id AS "menuItemId",
                sum(qty)::int AS "qtySold"
           FROM sale_items
          WHERE sale_created_at >= (now() AT TIME ZONE 'UTC')::date - ($1::int - 1)
          GROUP BY 1, 2
          ORDER BY 1, 2`,
        [days],
      ),
  );
}
