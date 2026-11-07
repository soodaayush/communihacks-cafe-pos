import { dbOrMock } from "@/lib/api";
import { query } from "@/lib/db";
import { mockRestock } from "@/lib/mock-data";
import type { RestockSuggestion } from "@/lib/types";

// Menu items at or below their reorder level. Suggested amount = enough for a week at the last 7 days'
// selling pace, or double the reorder level, whichever is more, minus what is on the shelf.
export function GET() {
  return dbOrMock(
    () => mockRestock,
    () =>
      query<RestockSuggestion>(
        `WITH recent AS (
           SELECT menu_item_id, sum(qty) AS sold
             FROM sale_items
            WHERE sale_created_at >= now() - interval '7 days'
            GROUP BY 1
         )
         SELECT m.id AS "menuItemId",
                m.stock,
                m.reorder_level AS "reorderLevel",
                GREATEST(coalesce(r.sold, 0)::int, m.reorder_level * 2) - m.stock AS "suggestedQty"
           FROM menu_items m
           LEFT JOIN recent r ON r.menu_item_id = m.id
          WHERE m.stock <= m.reorder_level
          ORDER BY (m.stock::float / NULLIF(m.reorder_level, 0)), m.name`,
      ),
  );
}
