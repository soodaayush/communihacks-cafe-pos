import { Suspense } from "react";
import { InsightList } from "@/components/insights/InsightList";
import type { SummaryRange } from "@/lib/types";

const RANGES: SummaryRange[] = ["day", "week", "month"];

// TODO(dev3): MoneyInOutLeft + CoinBarVisual + ExplanationBubble. Data: GET /api/summary, /api/expenses, /api/trends.
// TODO(dev3): picture buttons to switch range (day / week / month).
export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: raw } = await searchParams;
  const range = RANGES.includes(raw as SummaryRange) ? (raw as SummaryRange) : "week";
  return (
    <section className="flex flex-col gap-gap">
      <h1 className="text-hero">Money</h1>
      <Suspense fallback={<p className="text-number">⏳</p>}>
        <InsightList range={range} />
      </Suspense>
    </section>
  );
}
