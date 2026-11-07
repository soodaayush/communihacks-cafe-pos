import { HttpError, dbOrMock, isCount, isUuid, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { mockSupplies } from "@/lib/mock-data";
import type { InventoryItem } from "@/lib/types";

// POST /api/supplies/count  { inventoryItemId, stock }  ->  the updated InventoryItem
// Records how many of a back-room item there really are. The difference from the old number is
// written to the stock_movements ledger as an "adjustment", so the ledger always adds up.
export function POST(request: Request) {
  return dbOrMock<InventoryItem>(
    () => mockSupplies[0],
    async () => {
      const { inventoryItemId, stock } = await readJson(request);
      if (!isUuid(inventoryItemId)) throw new HttpError("inventoryItemId must be a uuid");
      if (!isCount(stock)) throw new HttpError("stock must be a whole number from 0 to 99999");

      return withTransaction(async (client) => {
        const current = await client.query<{ stock: number }>(
          `SELECT stock::float8 AS stock FROM inventory_items WHERE id = $1 FOR UPDATE`,
          [inventoryItemId],
        );
        if (!current.rows[0]) throw new HttpError("No such inventory item", 404);

        const change = stock - current.rows[0].stock;
        if (change !== 0) {
          await client.query(`UPDATE inventory_items SET stock = $2 WHERE id = $1`, [
            inventoryItemId,
            stock,
          ]);
          await client.query(
            `INSERT INTO stock_movements (inventory_item_id, change_qty, reason)
             VALUES ($1, $2, 'adjustment')`,
            [inventoryItemId, change],
          );
        }
        const { rows } = await client.query<InventoryItem>(
          `SELECT id, name, image_public_id AS "imagePublicId", category, unit,
                  stock::float8 AS stock, reorder_level::float8 AS "reorderLevel",
                  unit_cost_cents AS "unitCostCents"
             FROM inventory_items WHERE id = $1`,
          [inventoryItemId],
        );
        return rows[0];
      });
    },
  );
}
