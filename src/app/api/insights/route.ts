import type { NextRequest } from "next/server";
import { getInsights } from "@/lib/insights";
import type { InsightsResponse, SummaryRange } from "@/lib/types";

const RANGES: SummaryRange[] = ["day", "week", "month"];

// GET /api/insights?range=day|week|month  ->  InsightsResponse (top 3 simple insights + all metrics)
export async function GET(request: NextRequest) {
  const range = (request.nextUrl.searchParams.get("range") ?? "week") as SummaryRange;
  if (!RANGES.includes(range)) {
    return Response.json({ error: "range must be day, week or month" }, { status: 400 });
  }
  return Response.json((await getInsights(range)) satisfies InsightsResponse);
}
