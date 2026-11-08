import { withTransaction } from "./db";
import {
  priceSale,
  takeFromStock,
  type MenuRow,
  type RecipeRow,
  type SaleInput,
} from "./sale-math";
import type { DrinkSize, Sale, SaleItem } from "./types";

export type { SaleLine } from "./sale-math";

/**
 * Records one sale in a single transaction, so the money and the stock always agree:
 *   - a sales row and its sale_items rows (prices from the menu + the drink size, see sale-math.ts)
 *   - food comes off the shelf (menu_items.stock)
 *   - drinks are made from the back room: their recipe for that size (recipes table) is subtracted
 *     from inventory_items and written to the stock_movements ledger as "use"
 * The sale's time is kept to the millisecond: its items point back to it by (id, time), and a
 * JavaScript date only has milliseconds, so a finer time would never match.
 * A sale with a clientRef that was already recorded is not recorded again (a retry after the
 * Wi-Fi came back); the first one is returned.
 */
export function createSale({ paymentMethod, lines, clientRef, soldAt }: SaleInput): Promise<Sale> {
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  return withTransaction<Sale>(async (client) => {
    if (clientRef) {
      // One retry at a time per sale, then look for it.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [clientRef]);
      const done = await client.query<{
        id: string;
        created_at: Date;
        payment_method: string;
        total_cents: number;
      }>(
        `SELECT id, created_at, payment_method, total_cents FROM sales
          WHERE client_ref = $1 AND created_at > now() - interval '7 days' LIMIT 1`,
        [clientRef],
      );
      if (done.rows[0]) {
        const s = done.rows[0];
        const items = await client.query<SaleItem & { size: DrinkSize | null }>(
          `SELECT menu_item_id AS "menuItemId", size, qty, unit_price_cents AS "unitPriceCents",
                  unit_cost_cents AS "unitCostCents"
             FROM sale_items WHERE sale_id = $1 AND sale_created_at = $2`,
          [s.id, s.created_at],
        );
        return {
          id: s.id,
          createdAt: s.created_at.toISOString(),
          paymentMethod: s.payment_method as Sale["paymentMethod"],
          totalCents: s.total_cents,
          items: items.rows.map(({ size, ...i }) => ({ ...i, ...(size && { size }) })),
        };
      }
    }

    const menu = await client.query<MenuRow>(
      `SELECT id, category, price_cents, cost_cents FROM menu_items WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [ids],
    );
    // Every recipe line for the drinks in this order, with what that ingredient costs per unit.
    const recipes = await client.query<RecipeRow>(
      `SELECT r.menu_item_id, r.size, r.inventory_item_id, r.qty::float8 AS qty,
              (i.unit_cost_cents / i.pack_size)::float8 AS unit_cost
         FROM recipes r
         JOIN inventory_items i ON i.id = r.inventory_item_id
        WHERE r.menu_item_id = ANY($1::uuid[])`,
      [ids],
    );
    const { items, totalCents, shelf, used } = priceSale(lines, menu.rows, recipes.rows);

    const sale = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO sales (payment_method, total_cents, client_ref, created_at)
       VALUES ($1, $2, $3, date_trunc('milliseconds', coalesce($4::timestamptz, now())))
       RETURNING id, created_at`,
      [paymentMethod, totalCents, clientRef ?? null, soldAt?.toISOString() ?? null],
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

    // Food: take it off the shelf.
    if (shelf.size) {
      await client.query(
        `UPDATE menu_items m SET stock = GREATEST(m.stock - s.qty, 0)
           FROM unnest($1::uuid[], $2::int[]) AS s(id, qty) WHERE m.id = s.id`,
        [[...shelf.keys()], [...shelf.values()]],
      );
    }

    // Drinks: take their ingredients out of the back room and log it in the ledger.
    if (used.size) {
      const current = await client.query<{ id: string; stock: number }>(
        `SELECT id, stock::float8 AS stock FROM inventory_items WHERE id = ANY($1::uuid[]) FOR UPDATE`,
        [[...used.keys()]],
      );
      const taken = takeFromStock(current.rows, used);
      if (taken.length) {
        await client.query(
          `UPDATE inventory_items i SET stock = i.stock - t.amount
             FROM unnest($1::uuid[], $2::numeric[]) AS t(id, amount) WHERE i.id = t.id`,
          [taken.map((t) => t.id), taken.map((t) => t.amount)],
        );
        await client.query(
          `INSERT INTO stock_movements (inventory_item_id, created_at, change_qty, reason)
           SELECT t.id, $3, -t.amount, 'use' FROM unnest($1::uuid[], $2::numeric[]) AS t(id, amount)`,
          [taken.map((t) => t.id), taken.map((t) => t.amount), created_at],
        );
      }
    }

    return { id, createdAt: created_at.toISOString(), paymentMethod, totalCents, items };
  });
}
