import type { NextRequest } from "next/server";
import { dbOrMock } from "@/lib/api";
import { mockSummary } from "@/lib/mock-data";
import { queryDaySummaries } from "@/lib/money-data";
import type { SummaryRange } from "@/lib/types";

const RANGES: SummaryRange[] = ["day", "week", "month"];
const DAYS: Record<SummaryRange, number> = { day: 1, week: 7, month: 30 };

// GET /api/summary?range=day|week|month  ->  DaySummary[] (one per day, newest first)
//   moneyIn  = sales taken that day            (sales_daily continuous aggregate)
//   moneyOut = expenses that day               (restocks are logged as "inventory" expenses)
//   left     = moneyIn - moneyOut              (cash position)
//   profit   = sales - cost of what was sold - non-inventory expenses
//              (inventory spend is already counted through the cost of goods sold: item_daily)
// time_bucket_gapfill makes sure days with no sales still appear, as zeros. Days are UTC.
// The query lives in src/lib/money-data.ts (shared with the Money screen and insights).
export function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ?? "day") as SummaryRange;
  if (!RANGES.includes(range)) {
    return Response.json({ error: "range must be day, week or month" }, { status: 400 });
  }
  return dbOrMock(
    () => mockSummary(range),
    () => queryDaySummaries(DAYS[range]),
  );
}
