import { mockPurchase } from "@/lib/mock-data";
import type { Purchase } from "@/lib/types";

// Body: Omit<Purchase, "id" | "createdAt">
// TODO(dev1): validate body, insert purchase, increment stock.
export function POST() {
  return Response.json(mockPurchase satisfies Purchase, { status: 201 });
}
