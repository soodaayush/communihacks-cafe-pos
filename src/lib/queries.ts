import { query } from "./db";
import type { InventoryItem, MenuItem } from "./types";

// Shared by /api/menu and /api/inventory (both return menu items with their stock).
// Drinks have no shelf stock: their `stock` is how many SMALL drinks the back room can still make,
// worked out from the recipes (the ingredient that runs out first decides). So the register shows a
// drink as sold out when, say, the coffee beans are gone.
export function listMenu() {
  return query<MenuItem>(
    `SELECT m.id,
            m.name,
            m.image_public_id AS "imagePublicId",
            m.category,
            m.price_cents     AS "priceCents",
            m.cost_cents      AS "costCents",
            CASE WHEN m.category = 'drink' THEN
              coalesce((SELECT min(floor(i.stock / r.qty))::int
                          FROM recipes r
                          JOIN inventory_items i ON i.id = r.inventory_item_id
                         WHERE r.menu_item_id = m.id AND r.size = 'S'), m.stock)
            ELSE m.stock END  AS stock,
            m.reorder_level   AS "reorderLevel"
       FROM menu_items m
      ORDER BY m.category, m.name`,
  );
}

// One shape for back-room items everywhere (/api/supplies, counts, buying, movements).
// `usedLast7Days` reads the stock_movements hypertable: everything taken out for drinks this week.
const SUPPLY_COLUMNS = `
  i.id,
  i.name,
  i.image_public_id                          AS "imagePublicId",
  i.category,
  i.unit,
  i.stock::float8                            AS stock,
  i.reorder_level::float8                    AS "reorderLevel",
  i.unit_cost_cents                          AS "unitCostCents",
  coalesce(nullif(i.pack_name, ''), i.unit)  AS "packName",
  i.pack_size::float8                        AS "packSize",
  i.full_qty::float8                         AS "fullQty",
  coalesce((SELECT -sum(m.change_qty)
              FROM stock_movements m
             WHERE m.inventory_item_id = i.id
               AND m.reason = 'use'
               AND m.created_at >= now() - interval '7 days'), 0)::float8 AS "usedLast7Days"`;

/** All back-room items. Low ones first. */
export function listSupplies() {
  return query<InventoryItem>(
    `SELECT ${SUPPLY_COLUMNS}
       FROM inventory_items i
      ORDER BY (i.stock <= i.reorder_level) DESC, i.category, i.name`,
  );
}

/** One back-room item, read through `run` (a pooled query or a transaction client). */
export async function getSupply(
  run: (sql: string, params: unknown[]) => Promise<{ rows: InventoryItem[] }>,
  id: string,
): Promise<InventoryItem | undefined> {
  const { rows } = await run(`SELECT ${SUPPLY_COLUMNS} FROM inventory_items i WHERE i.id = $1`, [
    id,
  ]);
  return rows[0];
}
