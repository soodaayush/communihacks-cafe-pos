import { HttpError, dbOrMock, isUuid, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { mockSupplies } from "@/lib/mock-data";
import type { InventoryItem, StockMovement, StockReason } from "@/lib/types";

const REASONS: StockReason[] = ["purchase", "use", "waste", "adjustment"];

// Body: StockMovement. Logs the change and updates the item's stock; returns the updated InventoryItem.
export function POST(request: Request) {
  return dbOrMock(
    () => mockSupplies[0],
    async () => {
      const body = (await readJson(request)) as Partial<StockMovement>;
      const { inventoryItemId, changeQty, reason } = body;
      if (!isUuid(inventoryItemId)) throw new HttpError("inventoryItemId must be a uuid");
      if (typeof changeQty !== "number" || !Number.isFinite(changeQty) || changeQty === 0)
        throw new HttpError("changeQty must be a non-zero number");
      if (!reason || !REASONS.includes(reason))
        throw new HttpError(`reason must be one of ${REASONS.join(", ")}`);
      if ((reason === "purchase") !== changeQty > 0 && reason !== "adjustment")
        throw new HttpError("purchase adds stock; use and waste remove it");

      return withTransaction(async (client) => {
        const { rows } = await client.query<InventoryItem>(
          `UPDATE inventory_items
              SET stock = GREATEST(stock + $2, 0)
            WHERE id = $1
        RETURNING id, name, image_public_id AS "imagePublicId", category, unit,
                  stock::float8 AS stock, reorder_level::float8 AS "reorderLevel",
                  unit_cost_cents AS "unitCostCents"`,
          [inventoryItemId, changeQty],
        );
        if (!rows[0]) throw new HttpError("No such inventory item", 404);
        await client.query(
          `INSERT INTO stock_movements (inventory_item_id, change_qty, reason) VALUES ($1, $2, $3)`,
          [inventoryItemId, changeQty, reason],
        );
        return rows[0];
      });
    },
    201,
  );
}
