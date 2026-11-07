import { connection } from "next/server";
import { getInsights } from "@/lib/insights";
import type { SummaryRange } from "@/lib/types";
import { InsightCard } from "./InsightCard";

export interface InsightListProps {
  range: SummaryRange;
}

// Server component: renders at request time (never at build), so Gemini is not called during `next build`.
export async function InsightList({ range }: InsightListProps) {
  await connection();
  const { insights } = await getInsights(range);
  return (
    <div className="flex flex-col gap-gap">
      {insights.map((insight) => (
        <InsightCard key={insight.metricKey} insight={insight} />
      ))}
    </div>
  );
}
