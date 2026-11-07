import { mockTrends } from "@/lib/mock-data";
import type { TrendPoint } from "@/lib/types";

// TODO(dev1): qty sold per item per day from sale_items (time_bucket).
export function GET() {
  return Response.json(mockTrends satisfies TrendPoint[]);
}
