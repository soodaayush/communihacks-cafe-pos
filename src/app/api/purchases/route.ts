import { HttpError, dbOrMock, isCents, isPositiveInt, isUuid, readJson } from "@/lib/api";
import { withTransaction } from "@/lib/db";
import { mockPurchase } from "@/lib/mock-data";
import type { PaymentMethod, Purchase } from "@/lib/types";
import { staffOnly } from "@/lib/staff";

// Body: Omit<Purchase, "id" | "createdAt">.
// Buying stock records the purchase, adds the stock, and logs the money out as an "inventory" expense.
export function POST(request: Request) {
  return (
    staffOnly(request) ??
    dbOrMock(
      () => mockPurchase,
      async () => {
        const body = await readJson(request);
        const { menuItemId, qty, totalCostCents, paymentMethod } = body;
        if (!isUuid(menuItemId)) throw new HttpError("menuItemId must be a uuid");
        if (!isPositiveInt(qty)) throw new HttpError("qty must be a whole number above 0");
        if (!isCents(totalCostCents)) throw new HttpError("totalCostCents must be whole cents");
        if (paymentMethod !== "cash" && paymentMethod !== "debit")
          throw new HttpError("paymentMethod must be cash or debit");

        return withTransaction<Purchase>(async (client) => {
          const stock = await client.query(
            `UPDATE menu_items SET stock = stock + $2 WHERE id = $1`,
            [menuItemId, qty],
          );
          if (stock.rowCount === 0) throw new HttpError("Unknown menuItemId", 404);

          const { rows } = await client.query<Purchase>(
            `INSERT INTO purchases (menu_item_id, qty, total_cost_cents, payment_method)
           VALUES ($1, $2, $3, $4)
        RETURNING id, menu_item_id AS "menuItemId", qty, total_cost_cents AS "totalCostCents",
                  payment_method AS "paymentMethod", created_at AS "createdAt"`,
            [menuItemId, qty, totalCostCents, paymentMethod as PaymentMethod],
          );
          await client.query(
            `INSERT INTO expenses (type, amount_cents, date) VALUES ('inventory', $1, (now() AT TIME ZONE 'America/Toronto')::date)`,
            [totalCostCents],
          );
          return rows[0];
        });
      },
      201,
    )
  );
}
