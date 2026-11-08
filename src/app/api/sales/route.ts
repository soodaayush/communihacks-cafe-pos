import { HttpError, dbOrMock, readJson } from "@/lib/api";
import { applyMockSale, mockSale } from "@/lib/mock-data";
import { parseSaleBody } from "@/lib/sale-math";
import { createSale } from "@/lib/sales";

// Body: { paymentMethod, items: [{ menuItemId, size?, qty }], clientRef?, soldAt? }
// Prices, costs and the total come from the menu (+ drink size), so the client cannot change them.
// Limits: 30 lines, 50 of one item (sale-math.ts). clientRef makes a retried sale count once;
// soldAt keeps the time of a sale that waited on the tablet while the Wi-Fi was down.
export async function POST(request: Request) {
  const body = await readJson(request).catch(() => null);
  return dbOrMock(
    () => {
      applyMockSale(body?.items); // no DB: still take the items off the mock shelf
      return mockSale;
    },
    async () => {
      if (!body) throw new HttpError("Body must be a JSON object");
      return createSale(parseSaleBody(body));
    },
    201,
  );
}
