import { HttpError, dbOrMock, isUuid, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { mockSupplies } from "@/lib/mock-data";
import { getSupply } from "@/lib/queries";
import type { StockMovement, StockReason } from "@/lib/types";
import { staffOnly } from "@/lib/staff";

const REASONS: StockReason[] = ["purchase", "use", "waste", "adjustment"];

// Body: StockMovement. Logs the change and updates the item's stock; returns the updated InventoryItem.
export function POST(request: Request) {
  return (
    staffOnly(request) ??
    dbOrMock(
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
          const current = await client.query<{ stock: number }>(
            `SELECT stock::float8 AS stock FROM inventory_items WHERE id = $1 FOR UPDATE`,
            [inventoryItemId],
          );
          if (!current.rows[0]) throw new HttpError("No such inventory item", 404);
          // Stock never goes below 0, and the ledger records only what really changed.
          const change = Math.max(changeQty, -current.rows[0].stock);
          if (change !== 0) {
            await client.query(`UPDATE inventory_items SET stock = stock + $2 WHERE id = $1`, [
              inventoryItemId,
              change,
            ]);
            await client.query(
              `INSERT INTO stock_movements (inventory_item_id, change_qty, reason) VALUES ($1, $2, $3)`,
              [inventoryItemId, change, reason],
            );
          }
          return (await getSupply((sql, params) => client.query(sql, params), inventoryItemId))!;
        });
      },
      201,
    )
  );
}
