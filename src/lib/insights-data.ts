import { hasDb } from "./db";
import type { InsightsInput } from "./metrics";
import { mockMenu, RANGE_DAYS } from "./mock-data";
import { getDaySummaries, getExpenses, getItemSales } from "./money-data";
import { listMenu } from "./queries";
import type { SummaryRange } from "./types";

// Money + sales history for one period and the period before it (Tiger Data, or mock data
// when DATABASE_URL is not set).
export async function getInsightsInput(range: SummaryRange): Promise<InsightsInput> {
  const n = RANGE_DAYS[range];
  const [menu, days, previousDays, itemSales, expenses] = await Promise.all([
    hasDb() ? listMenu() : mockMenu,
    getDaySummaries(n),
    getDaySummaries(n, n),
    getItemSales(n),
    getExpenses(n),
  ]);
  return { range, menu, days, previousDays, itemSales, expenses };
}
