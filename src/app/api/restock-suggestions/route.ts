import { mockRestock } from "@/lib/mock-data";
import type { RestockSuggestion } from "@/lib/types";

// TODO(dev1): items at or below reorder_level, suggestedQty from recent sales trend.
export function GET() {
  return Response.json(mockRestock satisfies RestockSuggestion[]);
}
