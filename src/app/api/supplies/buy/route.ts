import { HttpError, dbOrMock, isUuid, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";

export interface BuyResult {
  name: string;
  /** How many packs were bought, and what a pack is called: 2 "bags". */
  qty: number;
  unit: string;
  costCents: number;
  /** How much there is now, after this purchase, in the item's own unit (e.g. 3000 "g"). */
  stock: number;
  stockUnit: string;
}

// Body: { inventoryItemId, qty (whole number of packs, 1-99) }
// "We bought some": in one transaction the stock goes up by qty x pack size (2 bags of beans =
// 2000 g), the delivery is logged in the stock_movements ledger, and the money spent
// (qty x pack price) is recorded as an expense.
export function POST(request: Request) {
  return dbOrMock<BuyResult>(
    () => ({
      name: "Coffee beans",
      qty: 1,
      unit: "bags",
      costCents: 1800,
      stock: 3000,
      stockUnit: "g",
    }),
    async () => {
      const body = await readJson(request);
      const { inventoryItemId, qty } = body;
      if (!isUuid(inventoryItemId)) throw new HttpError("inventoryItemId must be a uuid");
      if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > 99)
        throw new HttpError("qty must be a whole number from 1 to 99");
      const packs = qty as number;

      return withTransaction(async (client) => {
        const { rows } = await client.query<{
          name: string;
          unit: string;
          pack_name: string;
          added: number;
          unit_cost_cents: number;
          stock: number;
        }>(
          `UPDATE inventory_items SET stock = stock + $2 * pack_size
            WHERE id = $1
        RETURNING name, unit, coalesce(nullif(pack_name, ''), unit) AS pack_name,
                  ($2 * pack_size)::float8 AS added, unit_cost_cents, stock::float8 AS stock`,
          [inventoryItemId, packs],
        );
        const item = rows[0];
        if (!item) throw new HttpError("No such inventory item", 404);
        const costCents = packs * item.unit_cost_cents;
        await client.query(
          `INSERT INTO stock_movements (inventory_item_id, change_qty, reason) VALUES ($1, $2, 'purchase')`,
          [inventoryItemId, item.added],
        );
        await client.query(
          `INSERT INTO expenses (type, amount_cents, date)
           VALUES ('inventory', $1, (now() AT TIME ZONE 'UTC')::date)`,
          [costCents],
        );
        return {
          name: item.name,
          qty: packs,
          unit: item.pack_name,
          costCents,
          stock: item.stock,
          stockUnit: item.unit,
        };
      });
    },
    201,
  );
}
