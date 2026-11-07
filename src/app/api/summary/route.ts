import type { NextRequest } from "next/server";
import { mockSummary } from "@/lib/mock-data";
import type { DaySummary, SummaryRange } from "@/lib/types";

const RANGES: SummaryRange[] = ["day", "week", "month"];

// GET /api/summary?range=day|week|month  ->  DaySummary[] (one per day, newest first)
// TODO(dev1): compute from sales, purchases and expenses (time_bucket by day).
export function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ?? "day") as SummaryRange;
  if (!RANGES.includes(range)) {
    return Response.json({ error: "range must be day, week or month" }, { status: 400 });
  }
  return Response.json(mockSummary(range) satisfies DaySummary[]);
}
