// The thinking behind a sale, with no database: checking what the register sent, pricing it,
// and working out what comes off the shelf and out of the back room. src/lib/sales.ts does the
// saving. Kept pure so it can be tested (sale-math.test.ts).
import { HttpError, isPositiveInt, isUuid } from "./api";
import { hasSizes, isSize, sizePriceCents } from "./sizes";
import type { DrinkSize, PaymentMethod, SaleItem } from "./types";

/** Limits that stop a stray tap from recording 9,999 coffees. */
export const MAX_PER_LINE = 50;
export const MAX_LINES = 30;
/** A sale saved on the tablet while offline keeps its time, if it is no older than this. */
export const MAX_OFFLINE_AGE_MS = 3 * 24 * 3_600_000;

export interface SaleLine {
  menuItemId: string;
  size?: DrinkSize;
  qty: number;
}
export interface SaleInput {
  paymentMethod: PaymentMethod;
  lines: SaleLine[];
  /** The register's own id for this sale: sending it twice records it once. */
  clientRef?: string;
  /** When it was sold, for a sale that waited on the tablet while the Wi-Fi was down. */
  soldAt?: Date;
}

/** Checks the body of POST /api/sales. Merges repeated lines (same item and size). */
export function parseSaleBody(body: Record<string, unknown>, now = new Date()): SaleInput {
  const paymentMethod = body.paymentMethod;
  if (paymentMethod !== "cash" && paymentMethod !== "debit")
    throw new HttpError("paymentMethod must be cash or debit");
  if (!Array.isArray(body.items) || body.items.length === 0)
    throw new HttpError("items must be a non-empty array");
  if (body.items.length > MAX_LINES)
    throw new HttpError(`a sale can have at most ${MAX_LINES} lines`);

  const lines = new Map<string, SaleLine>();
  for (const line of body.items as { menuItemId?: unknown; qty?: unknown; size?: unknown }[]) {
    if (!isUuid(line?.menuItemId)) throw new HttpError("menuItemId must be a uuid");
    if (!isPositiveInt(line.qty) || line.qty > MAX_PER_LINE)
      throw new HttpError(`qty must be a whole number from 1 to ${MAX_PER_LINE}`);
    if (line.size != null && !isSize(line.size)) throw new HttpError("size must be S, M or L");
    const size = isSize(line.size) ? line.size : undefined;
    const key = `${line.menuItemId}|${size ?? ""}`;
    const qty = (lines.get(key)?.qty ?? 0) + line.qty;
    if (qty > MAX_PER_LINE) throw new HttpError(`at most ${MAX_PER_LINE} of one item in a sale`);
    lines.set(key, { menuItemId: line.menuItemId, size, qty });
  }

  const input: SaleInput = { paymentMethod, lines: [...lines.values()] };
  if (body.clientRef != null) {
    if (typeof body.clientRef !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(body.clientRef))
      throw new HttpError("clientRef must be 8-64 letters, digits or dashes");
    input.clientRef = body.clientRef;
  }
  if (body.soldAt != null) {
    const soldAt = new Date(String(body.soldAt));
    const age = now.getTime() - soldAt.getTime();
    // Only believe a time from the recent past (a little clock difference is fine).
    if (!Number.isNaN(soldAt.getTime()) && age >= -120_000 && age <= MAX_OFFLINE_AGE_MS)
      input.soldAt = new Date(Math.min(soldAt.getTime(), now.getTime()));
  }
  return input;
}

export interface MenuRow {
  id: string;
  category: string;
  price_cents: number;
  cost_cents: number;
}
export interface RecipeRow {
  menu_item_id: string;
  size: DrinkSize;
  inventory_item_id: string;
  qty: number;
  /** What one unit of the ingredient costs, in cents (pack price / pack size). */
  unit_cost: number;
}
export interface PricedSale {
  items: SaleItem[];
  totalCents: number;
  /** Food: menu item id -> how many come off the shelf. */
  shelf: Map<string, number>;
  /** Drinks: inventory item id -> how much of it the drinks use. */
  used: Map<string, number>;
}

/**
 * Prices come from the menu (+ the drink size), never from the register. A drink with no size is
 * a small; only drinks have sizes. A drink costs what its ingredients cost; anything without a
 * recipe uses the menu's cost.
 */
export function priceSale(lines: SaleLine[], menu: MenuRow[], recipes: RecipeRow[]): PricedSale {
  const byId = new Map(menu.map((m) => [m.id, m]));
  const recipeOf = (id: string, size: DrinkSize) =>
    recipes.filter((r) => r.menu_item_id === id && r.size === size);
  const shelf = new Map<string, number>();
  const used = new Map<string, number>();

  const items = lines.map((l): SaleItem => {
    const m = byId.get(l.menuItemId);
    if (!m) throw new HttpError("Unknown menuItemId", 404);
    if (l.size && !hasSizes(m.category)) throw new HttpError("Only drinks come in sizes");
    const size = hasSizes(m.category) ? (l.size ?? "S") : undefined;
    const recipe = size ? recipeOf(m.id, size) : [];
    if (size) {
      for (const r of recipe)
        used.set(r.inventory_item_id, (used.get(r.inventory_item_id) ?? 0) + l.qty * r.qty);
    } else {
      shelf.set(m.id, (shelf.get(m.id) ?? 0) + l.qty);
    }
    const ingredientCost = recipe.reduce((sum, r) => sum + r.qty * r.unit_cost, 0);
    return {
      menuItemId: m.id,
      ...(size && { size }),
      qty: l.qty,
      unitPriceCents: sizePriceCents(m.price_cents, size),
      unitCostCents: recipe.length ? Math.round(ingredientCost) : m.cost_cents,
    };
  });
  const totalCents = items.reduce((sum, i) => sum + i.qty * i.unitPriceCents, 0);
  return { items, totalCents, shelf, used };
}

/** What can really be taken: never more than what is there, so stock never goes below 0. */
export function takeFromStock(
  current: { id: string; stock: number }[],
  used: Map<string, number>,
): { id: string; amount: number }[] {
  return current
    .map((row) => ({ id: row.id, amount: Math.min(row.stock, used.get(row.id) ?? 0) }))
    .filter((t) => t.amount > 0);
}
