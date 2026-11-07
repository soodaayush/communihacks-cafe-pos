import type { NextRequest } from "next/server";
import { dbOrMock } from "@/lib/api";
import { mockBusyHours } from "@/lib/mock-data";
import { queryBusyHours } from "@/lib/money-data";

// GET /api/busy-hours?days=14  ->  sales grouped by hour of the day (UTC), all 24 hours, days: 1-90.
// Built on the sales_hourly continuous aggregate.
export function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("days") ?? 14);
  const days = Number.isInteger(raw) ? Math.min(Math.max(raw, 1), 90) : 14;
  return dbOrMock(
    () => mockBusyHours,
    () => queryBusyHours(days),
  );
}
