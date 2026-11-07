import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockRestock } from "@/lib/mock-data";
import type { RestockSuggestion } from "@/lib/types";

// Forecast per menu item from the last 28 days of item_daily (exactly four of each weekday), so
// weekends count for more than quiet weekdays. Over the next 14 days we add up expected sales:
//   daysLeft     = full days the current stock covers (capped at 14)
//   suggestedQty = expected sales over the next 7 days (or double the reorder level, if more) - stock
// An item is suggested when it is at its reorder level or will run out within 3 days.
export function GET() {
  return dbOrMock(
    () => mockRestock,
    () =>
      query<RestockSuggestion>(
        `WITH today AS (
           SELECT ((now() AT TIME ZONE 'UTC')::date::timestamp AT TIME ZONE 'UTC') AS d
         ),
         pace AS (   -- average units sold per weekday, per item
           SELECT menu_item_id,
                  extract(dow FROM day AT TIME ZONE 'UTC')::int AS dow,
                  sum(qty_sold) / 4.0                           AS avg_qty
             FROM item_daily, today
            WHERE day >= today.d - interval '28 days' AND day < today.d
            GROUP BY 1, 2
         ),
         outlook AS (   -- running total of expected demand over the next 14 days
           SELECT m.id AS menu_item_id,
                  g.n,
                  sum(coalesce(p.avg_qty, 0)) OVER (PARTITION BY m.id ORDER BY g.n) AS cum_demand
             FROM menu_items m
            CROSS JOIN generate_series(0, 13) AS g(n)
             LEFT JOIN pace p
                    ON p.menu_item_id = m.id
                   AND p.dow = extract(dow FROM (now() AT TIME ZONE 'UTC')::date + g.n)::int
         ),
         forecast AS (
           SELECT o.menu_item_id,
                  count(*) FILTER (WHERE o.cum_demand <= m.stock)::int AS days_left,
                  max(o.cum_demand) FILTER (WHERE o.n = 6)             AS demand_7d
             FROM outlook o
             JOIN menu_items m ON m.id = o.menu_item_id
            GROUP BY 1
         )
         SELECT m.id AS "menuItemId",
                m.stock,
                m.reorder_level AS "reorderLevel",
                GREATEST(ceil(f.demand_7d)::int, m.reorder_level * 2) - m.stock AS "suggestedQty",
                f.days_left AS "daysLeft"
           FROM menu_items m
           JOIN forecast f ON f.menu_item_id = m.id
          WHERE m.stock <= m.reorder_level OR f.days_left <= 3
          ORDER BY f.days_left, m.name`,
      ),
  );
}
