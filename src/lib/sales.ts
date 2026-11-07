import { HttpError } from "./api";
import { withTransaction } from "./db";
import { hasSizes, sizePriceCents } from "./sizes";
import type { DrinkSize, PaymentMethod, Sale, SaleItem } from "./types";

/** One order line, already validated (uuid id, whole qty above 0, size S/M/L if given). */
export interface SaleLine {
  menuItemId: string;
  size?: DrinkSize;
  qty: number;
}

/**
 * Records one sale in a single transaction: sales row, sale_items rows, stock decrement.
 * Prices, costs and the total come from menu_items (plus the drink size, see sizes.ts), never from
 * the caller. Stock never goes below 0. A drink with no size is a small; only drinks take a size.
 */
export function createSale(paymentMethod: PaymentMethod, lines: SaleLine[]): Promise<Sale> {
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  return withTransaction<Sale>(async (client) => {
    const prices = await client.query<{
      id: string;
      category: string;
      price_cents: number;
      cost_cents: number;
    }>(
      `SELECT id, category, price_cents, cost_cents FROM menu_items WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [ids],
    );
    if (prices.rows.length !== ids.length) throw new HttpError("Unknown menuItemId", 404);
    const byId = new Map(prices.rows.map((p) => [p.id, p]));

    const items: SaleItem[] = lines.map((l) => {
      const p = byId.get(l.menuItemId)!;
      if (l.size && !hasSizes(p.category)) throw new HttpError("Only drinks come in sizes");
      const size = hasSizes(p.category) ? (l.size ?? "S") : undefined;
      return {
        menuItemId: p.id,
        ...(size && { size }),
        qty: l.qty,
        unitPriceCents: sizePriceCents(p.price_cents, size),
        unitCostCents: p.cost_cents,
      };
    });
    const qtyById = new Map<string, number>();
    for (const i of items) qtyById.set(i.menuItemId, (qtyById.get(i.menuItemId) ?? 0) + i.qty);
    const totalCents = items.reduce((sum, i) => sum + i.qty * i.unitPriceCents, 0);

    const sale = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO sales (payment_method, total_cents) VALUES ($1, $2) RETURNING id, created_at`,
      [paymentMethod, totalCents],
    );
    const { id, created_at } = sale.rows[0];

    await client.query(
      `INSERT INTO sale_items (sale_id, sale_created_at, menu_item_id, qty, unit_price_cents, unit_cost_cents, size)
       SELECT $1, $2, * FROM unnest($3::uuid[], $4::int[], $5::int[], $6::int[], $7::text[])`,
      [
        id,
        created_at,
        items.map((i) => i.menuItemId),
        items.map((i) => i.qty),
        items.map((i) => i.unitPriceCents),
        items.map((i) => i.unitCostCents),
        items.map((i) => i.size ?? null),
      ],
    );
    await client.query(
      `UPDATE menu_items m SET stock = GREATEST(m.stock - s.qty, 0)
         FROM unnest($1::uuid[], $2::int[]) AS s(id, qty) WHERE m.id = s.id`,
      [[...qtyById.keys()], [...qtyById.values()]],
    );

    return { id, createdAt: created_at.toISOString(), paymentMethod, totalCents, items };
  });
}
