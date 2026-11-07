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
 * Records one sale in a single transaction, so the money and the stock always agree:
 *   - a sales row and its sale_items rows (prices from menu_items + the drink size, never the caller)
 *   - food comes off the shelf (menu_items.stock)
 *   - drinks are made from the back room: their recipe for that size (recipes table) is subtracted
 *     from inventory_items and written to the stock_movements ledger as "use"
 * A drink's cost is what its ingredients cost (pack price / pack size x amount used), so profit
 * follows the real ingredients. Stock never goes below 0. A drink with no size is a small.
 */
export function createSale(paymentMethod: PaymentMethod, lines: SaleLine[]): Promise<Sale> {
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  return withTransaction<Sale>(async (client) => {
    const menu = await client.query<{
      id: string;
      category: string;
      price_cents: number;
      cost_cents: number;
    }>(
      `SELECT id, category, price_cents, cost_cents FROM menu_items WHERE id = ANY($1::uuid[]) FOR UPDATE`,
      [ids],
    );
    if (menu.rows.length !== ids.length) throw new HttpError("Unknown menuItemId", 404);
    const byId = new Map(menu.rows.map((p) => [p.id, p]));

    // Every recipe line for the drinks in this order, with what that ingredient costs per unit.
    const recipes = await client.query<{
      menu_item_id: string;
      size: DrinkSize;
      inventory_item_id: string;
      qty: number;
      unit_cost: number;
    }>(
      `SELECT r.menu_item_id, r.size, r.inventory_item_id, r.qty::float8 AS qty,
              (i.unit_cost_cents / i.pack_size)::float8 AS unit_cost
         FROM recipes r
         JOIN inventory_items i ON i.id = r.inventory_item_id
        WHERE r.menu_item_id = ANY($1::uuid[])`,
      [ids],
    );
    const recipeOf = (menuItemId: string, size: DrinkSize) =>
      recipes.rows.filter((r) => r.menu_item_id === menuItemId && r.size === size);

    const items: SaleItem[] = lines.map((l) => {
      const p = byId.get(l.menuItemId)!;
      if (l.size && !hasSizes(p.category)) throw new HttpError("Only drinks come in sizes");
      const size = hasSizes(p.category) ? (l.size ?? "S") : undefined;
      const recipe = size ? recipeOf(p.id, size) : [];
      const ingredientCost = recipe.reduce((sum, r) => sum + r.qty * r.unit_cost, 0);
      return {
        menuItemId: p.id,
        ...(size && { size }),
        qty: l.qty,
        unitPriceCents: sizePriceCents(p.price_cents, size),
        unitCostCents: recipe.length ? Math.round(ingredientCost) : p.cost_cents,
      };
    });
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

    // Food: take it off the shelf.
    const shelf = new Map<string, number>();
    for (const i of items) {
      if (!i.size) shelf.set(i.menuItemId, (shelf.get(i.menuItemId) ?? 0) + i.qty);
    }
    if (shelf.size) {
      await client.query(
        `UPDATE menu_items m SET stock = GREATEST(m.stock - s.qty, 0)
           FROM unnest($1::uuid[], $2::int[]) AS s(id, qty) WHERE m.id = s.id`,
        [[...shelf.keys()], [...shelf.values()]],
      );
    }

    // Drinks: take their ingredients out of the back room and log it in the ledger.
    const used = new Map<string, number>();
    for (const i of items) {
      if (!i.size) continue;
      for (const r of recipeOf(i.menuItemId, i.size)) {
        used.set(r.inventory_item_id, (used.get(r.inventory_item_id) ?? 0) + i.qty * r.qty);
      }
    }
    if (used.size) {
      const current = await client.query<{ id: string; stock: number }>(
        `SELECT id, stock::float8 AS stock FROM inventory_items WHERE id = ANY($1::uuid[]) FOR UPDATE`,
        [[...used.keys()]],
      );
      // Never below zero: log only what was really there to take.
      const taken = current.rows
        .map((row) => ({ id: row.id, amount: Math.min(row.stock, used.get(row.id) ?? 0) }))
        .filter((t) => t.amount > 0);
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
