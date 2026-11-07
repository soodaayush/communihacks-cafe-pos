import { mockSale } from "@/lib/mock-data";
import type { Sale } from "@/lib/types";

// Body: Omit<Sale, "id" | "createdAt">
// TODO(dev1): validate body, insert sales + sale_items in one transaction, decrement stock.
export function POST() {
  return Response.json(mockSale satisfies Sale, { status: 201 });
}
