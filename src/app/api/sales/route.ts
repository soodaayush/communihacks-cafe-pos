import { HttpError, dbOrMock, isPositiveInt, isUuid, readJson } from "@/lib/api";
import { applyMockSale, mockSale } from "@/lib/mock-data";
import { createSale } from "@/lib/sales";
import type { PaymentMethod } from "@/lib/types";

// Body: Omit<Sale, "id" | "createdAt">. Only paymentMethod and items[].{menuItemId, qty} are used:
// prices, costs and the total come from menu_items so the client cannot change them.
export async function POST(request: Request) {
  const body = await readJson(request).catch(() => null);
  return dbOrMock(
    () => {
      applyMockSale(body?.items); // no DB: still take the items off the mock shelf
      return mockSale;
    },
    async () => {
      if (!body) throw new HttpError("Body must be a JSON object");
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
      return createSale(paymentMethod, qtyById);
    },
    201,
  );
}
