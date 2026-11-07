import { query } from "./db";
import type { MenuItem } from "./types";

// Shared by /api/menu and /api/inventory (both return menu items with their stock).
export function listMenu() {
  return query<MenuItem>(
    `SELECT id,
            name,
            image_public_id AS "imagePublicId",
            category,
            price_cents     AS "priceCents",
            cost_cents      AS "costCents",
            stock,
            reorder_level   AS "reorderLevel"
       FROM menu_items
      ORDER BY category, name`,
  );
}
