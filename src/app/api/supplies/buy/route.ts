import { HttpError, dbOrMock, isUuid, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";

export interface BuyResult {
  name: string;
  qty: number;
  unit: string;
  costCents: number;
  /** How many there are now, after this purchase. */
  stock: number;
}

// Body: { inventoryItemId, qty (whole number 1-99) }
// "We bought some": in one transaction the stock goes up, the delivery is logged in the
// stock_movements ledger, and the money spent (qty × unit cost) is recorded as an expense.
export function POST(request: Request) {
  return dbOrMock<BuyResult>(
    () => ({ name: "Coffee beans", qty: 1, unit: "bags", costCents: 1800, stock: 7 }),
    async () => {
      const body = await readJson(request);
      const { inventoryItemId, qty } = body;
      if (!isUuid(inventoryItemId)) throw new HttpError("inventoryItemId must be a uuid");
      if (!Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > 99)
        throw new HttpError("qty must be a whole number from 1 to 99");
      const count = qty as number;

      return withTransaction(async (client) => {
        const { rows } = await client.query<{
          name: string;
          unit: string;
          unit_cost_cents: number;
          stock: number;
        }>(
          `UPDATE inventory_items SET stock = stock + $2
            WHERE id = $1
        RETURNING name, unit, unit_cost_cents, stock::float8 AS stock`,
          [inventoryItemId, count],
        );
        const item = rows[0];
        if (!item) throw new HttpError("No such inventory item", 404);
        const costCents = count * item.unit_cost_cents;
        await client.query(
          `INSERT INTO stock_movements (inventory_item_id, change_qty, reason) VALUES ($1, $2, 'purchase')`,
          [inventoryItemId, count],
        );
        await client.query(
          `INSERT INTO expenses (type, amount_cents, date)
           VALUES ('inventory', $1, (now() AT TIME ZONE 'UTC')::date)`,
          [costCents],
        );
        return {
          name: item.name,
          qty: count,
          unit: item.unit,
          costCents,
          stock: Math.round(item.stock),
        };
      });
    },
    201,
  );
}
