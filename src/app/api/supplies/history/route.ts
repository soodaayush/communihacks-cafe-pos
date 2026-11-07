import type { NextRequest } from "next/server";
import { HttpError, dbOrMock, isUuid } from "@/lib/api";
import { query } from "@/lib/db";
import { mockStockHistory } from "@/lib/mock-data";
import type { StockPoint } from "@/lib/types";

// GET /api/supplies/history?itemId=<uuid>&days=30  ->  end-of-day stock of one back-room item.
// Replays the stock_movements ledger backwards from today's stock; time_bucket_gapfill keeps days
// with no movements in the chart (their level simply carries over). days: 1-90.
export function GET(request: NextRequest) {
  const itemId = request.nextUrl.searchParams.get("itemId");
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 30);
  const days = Number.isInteger(raw) ? Math.min(Math.max(raw, 1), 90) : 30;
  return dbOrMock(
    () => mockStockHistory,
    async () => {
      if (!isUuid(itemId)) throw new HttpError("itemId must be a uuid");
      return query<StockPoint>(
        `WITH bounds AS (
           SELECT ((now() AT TIME ZONE 'UTC')::date::timestamp AT TIME ZONE 'UTC') AS today
         ),
         daily AS (
           SELECT time_bucket_gapfill(interval '1 day', created_at) AS day,
                  coalesce(sum(change_qty), 0)                      AS net
             FROM stock_movements, bounds
            WHERE inventory_item_id = $1
              AND created_at >= bounds.today - make_interval(days => $2::int - 1)
              AND created_at <  bounds.today + interval '1 day'
            GROUP BY 1
         )
         SELECT to_char(day AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
                (i.stock + sum(net) OVER (ORDER BY day)
                         - sum(net) OVER ())::float8          AS stock
           FROM daily, inventory_items i
          WHERE i.id = $1
          ORDER BY day`,
        [itemId, days],
      );
    },
  );
}
