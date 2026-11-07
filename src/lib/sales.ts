import { HttpError } from "./api";
import { withTransaction } from "./db";
import type { PaymentMethod, Sale } from "./types";

/**
 * Records one sale in a single transaction: sales row, sale_items rows, stock decrement.
 * Prices, costs and the total come from menu_items, never from the caller. Stock never goes below 0.
 * `qtyById` maps menu item id -> quantity (already validated: uuid keys, whole qty above 0).
 */
export function createSale(
  paymentMethod: PaymentMethod,
  qtyById: Map<string, number>,
): Promise<Sale> {
  const ids = [...qtyById.keys()];
  return withTransaction<Sale>(async (client) => {
    const prices = await client.query<{ id: string; price_cents: number; cost_cents: number }>(
      `SELECT id, price_cents, cost_cents FROM menu_items WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [ids],
    );
    if (prices.rows.length !== ids.length) throw new HttpError("Unknown menuItemId", 404);

    const items = prices.rows.map((p) => ({
      menuItemId: p.id,
      qty: qtyById.get(p.id)!,
      unitPriceCents: p.price_cents,
      unitCostCents: p.cost_cents,
    }));
    const totalCents = items.reduce((sum, i) => sum + i.qty * i.unitPriceCents, 0);

    const sale = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO sales (payment_method, total_cents) VALUES ($1, $2) RETURNING id, created_at`,
      [paymentMethod, totalCents],
    );
    const { id, created_at } = sale.rows[0];

    await client.query(
      `INSERT INTO sale_items (sale_id, sale_created_at, menu_item_id, qty, unit_price_cents, unit_cost_cents)
       SELECT $1, $2, * FROM unnest($3::uuid[], $4::int[], $5::int[], $6::int[])`,
      [
        id,
        created_at,
        items.map((i) => i.menuItemId),
        items.map((i) => i.qty),
        items.map((i) => i.unitPriceCents),
        items.map((i) => i.unitCostCents),
      ],
    );
    await client.query(
      `UPDATE menu_items m SET stock = GREATEST(m.stock - s.qty, 0)
         FROM unnest($1::uuid[], $2::int[]) AS s(id, qty) WHERE m.id = s.id`,
      [items.map((i) => i.menuItemId), items.map((i) => i.qty)],
    );

    return { id, createdAt: created_at.toISOString(), paymentMethod, totalCents, items };
  });
}
