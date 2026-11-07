import { mockExpenses, mockItemSales, mockMenu, mockSummary, RANGE_DAYS } from "./mock-data";
import type { InsightsInput } from "./metrics";
import type { SummaryRange } from "./types";

// Gathers inventory + money history for one period and the period before it.
// TODO(dev1): replace mocks with Tiger Data queries, e.g.
//   itemSales: SELECT time_bucket('1 day', sale_created_at) AS date, menu_item_id, sum(qty)
//              FROM sale_items WHERE sale_created_at >= now() - $1::interval GROUP BY 1, 2
//   days / previousDays: same logic as GET /api/summary, shifted by one period.
export async function getInsightsInput(range: SummaryRange): Promise<InsightsInput> {
  const days = mockSummary(range);
  const oldest = days[days.length - 1].date;
  return {
    range,
    menu: mockMenu,
    days,
    previousDays: mockSummary(range, RANGE_DAYS[range]),
    itemSales: mockItemSales(range),
    expenses: mockExpenses.filter((e) => e.date >= oldest),
  };
}
