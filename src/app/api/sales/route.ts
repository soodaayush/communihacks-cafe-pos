import { HttpError, dbOrMock, isPositiveInt, isUuid, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { mockSale } from "@/lib/mock-data";
import type { PaymentMethod, Sale } from "@/lib/types";

// Body: Omit<Sale, "id" | "createdAt">. Only paymentMethod and items[].{menuItemId, qty} are used:
// prices, costs and the total come from menu_items so the client cannot change them.
export function POST(request: Request) {
  return dbOrMock(
    () => mockSale,
    async () => {
      const body = await readJson(request);
      const paymentMethod = body.paymentMethod as PaymentMethod;
      if (paymentMethod !== "cash" && paymentMethod !== "debit")
        throw new HttpError("paymentMethod must be cash or debit");
      if (!Array.isArray(body.items) || body.items.length === 0)
        throw new HttpError("items must be a non-empty array");

      // Merge duplicate lines so each menu item appears once.
      const qtyById = new Map<string, number>();
      for (const line of body.items as { menuItemId?: unknown; qty?: unknown }[]) {
        if (!isUuid(line?.menuItemId)) throw new HttpError("menuItemId must be a uuid");
        if (!isPositiveInt(line.qty)) throw new HttpError("qty must be a whole number above 0");
        qtyById.set(line.menuItemId, (qtyById.get(line.menuItemId) ?? 0) + line.qty);
      }
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
        // Stock never goes below zero: a busy register should not fail because the count was off.
        await client.query(
          `UPDATE menu_items m SET stock = GREATEST(m.stock - s.qty, 0)
             FROM unnest($1::uuid[], $2::int[]) AS s(id, qty) WHERE m.id = s.id`,
          [items.map((i) => i.menuItemId), items.map((i) => i.qty)],
        );

        return { id, createdAt: created_at.toISOString(), paymentMethod, totalCents, items };
      });
    },
    201,
  );
}
