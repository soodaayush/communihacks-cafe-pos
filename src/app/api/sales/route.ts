import { HttpError, dbOrMock, isPositiveInt, isUuid, readJson } from "@/lib/api";
import { applyMockSale, mockSale } from "@/lib/mock-data";
import { createSale, type SaleLine } from "@/lib/sales";
import { isSize } from "@/lib/sizes";
import type { PaymentMethod } from "@/lib/types";

// Body: Omit<Sale, "id" | "createdAt">. Only paymentMethod and items[].{menuItemId, size, qty} are used:
// prices, costs and the total come from menu_items (+ drink size) so the client cannot change them.
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

      // Merge duplicate lines so each item + size appears once.
      const lines = new Map<string, SaleLine>();
      for (const line of body.items as { menuItemId?: unknown; qty?: unknown; size?: unknown }[]) {
        if (!isUuid(line?.menuItemId)) throw new HttpError("menuItemId must be a uuid");
        if (!isPositiveInt(line.qty)) throw new HttpError("qty must be a whole number above 0");
        if (line.size != null && !isSize(line.size)) throw new HttpError("size must be S, M or L");
        const size = isSize(line.size) ? line.size : undefined;
        const key = `${line.menuItemId}|${size ?? ""}`;
        lines.set(key, {
          menuItemId: line.menuItemId,
          size,
          qty: (lines.get(key)?.qty ?? 0) + line.qty,
        });
      }
      return createSale(paymentMethod, [...lines.values()]);
    },
    201,
  );
}
