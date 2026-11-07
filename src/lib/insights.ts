// Server-only. Metrics (code) -> pick + phrase (Gemini, with local fallback) -> Insight[].
import { pickInsights, type GeminiInsight } from "./integrations/gemini";
import { getInsightsInput } from "./insights-data";
import { computeMetrics } from "./metrics";
import type { Insight, InsightsResponse, Metric, MetricKey, SummaryRange } from "./types";

const MAX_INSIGHTS = 3;
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: InsightsResponse }>();

const LOCAL: Record<MetricKey, { icon: string; headline: string }> = {
  runningOut: { icon: "⏳", headline: "Running out soon" },
  lowStock: { icon: "📦", headline: "Running low" },
  moneyLeft: { icon: "💰", headline: "Money you kept" },
  moneyLeftChange: { icon: "📈", headline: "Compared to before" },
  bestSeller: { icon: "⭐", headline: "Most popular" },
  bestEarner: { icon: "🏆", headline: "Best money maker" },
  biggestCost: { icon: "🧾", headline: "Biggest cost" },
  slowSeller: { icon: "🐢", headline: "Slow seller" },
};
const PRIORITY = Object.keys(LOCAL) as MetricKey[];

function rankLocally(metrics: Metric[]): Metric[] {
  const score = (m: Metric) => (m.tone === "watch" ? 0 : 100) + PRIORITY.indexOf(m.key);
  return [...metrics].sort((a, b) => score(a) - score(b)).slice(0, MAX_INSIGHTS);
}

function toInsight(metric: Metric, words?: GeminiInsight): Insight {
  const local = LOCAL[metric.key];
  const icon = metric.key === "moneyLeftChange" && metric.tone === "watch" ? "📉" : local.icon;
  return {
    metricKey: metric.key,
    tone: metric.tone,
    icon: words?.icon || icon,
    headline: words?.headline || local.headline,
    sentence: words?.sentence || metric.fact,
    valueCents: metric.valueCents,
    count: metric.count,
    menuItemId: metric.menuItemId,
  };
}

// Reject AI wording that contains any number not present in the computed fact.
const numbersIn = (s: string) =>
  (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => Number(n.replace(/,/g, "")));
function numbersMatch(words: GeminiInsight, fact: string): boolean {
  const allowed = new Set(numbersIn(fact));
  return numbersIn(`${words.headline} ${words.sentence}`).every((n) => allowed.has(n));
}

export async function getInsights(range: SummaryRange): Promise<InsightsResponse> {
  const metrics = computeMetrics(await getInsightsInput(range));
  const cacheKey = `${range}:${metrics.map((m) => m.fact).join("|")}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const byKey = new Map(metrics.map((m) => [m.key, m]));
  const picks = await pickInsights(metrics, MAX_INSIGHTS);
  const seen = new Set<MetricKey>();
  const fromGemini = (picks ?? [])
    .filter((p) => byKey.has(p.metricKey) && !seen.has(p.metricKey) && seen.add(p.metricKey))
    .slice(0, MAX_INSIGHTS)
    .map((p) => {
      const metric = byKey.get(p.metricKey)!;
      return toInsight(metric, numbersMatch(p, metric.fact) ? p : undefined);
    });

  const value: InsightsResponse = fromGemini.length
    ? { range, source: "gemini", insights: fromGemini, metrics }
    : { range, source: "local", insights: rankLocally(metrics).map((m) => toInsight(m)), metrics };
  // Only cache AI answers, so one slow or failed call doesn't stick for CACHE_MS.
  if (value.source === "gemini") cache.set(cacheKey, { at: Date.now(), value });
  return value;
}
