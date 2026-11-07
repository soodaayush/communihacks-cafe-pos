// Pure, deterministic metrics. All arithmetic lives here, never in the AI.
import { formatCents } from "./money";
import type {
  DaySummary,
  Expense,
  ExpenseType,
  MenuItem,
  Metric,
  SummaryRange,
  TrendPoint,
} from "./types";

export interface InsightsInput {
  range: SummaryRange;
  menu: MenuItem[];
  days: DaySummary[]; // current period
  previousDays: DaySummary[]; // same length, the period before
  itemSales: TrendPoint[]; // current period
  expenses: Expense[]; // current period
}

const NOW: Record<SummaryRange, string> = { day: "today", week: "this week", month: "this month" };
const BEFORE: Record<SummaryRange, string> = {
  day: "yesterday",
  week: "last week",
  month: "last month",
};
const COST_WORDS: Record<ExpenseType, string> = {
  rent: "rent",
  salary: "pay for workers",
  inventory: "buying food and drinks",
  other: "other things",
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function computeMetrics(input: InsightsInput): Metric[] {
  const { range, menu, days, previousDays, itemSales, expenses } = input;
  const now = NOW[range];
  const metrics: Metric[] = [];

  const left = sum(days.map((d) => d.leftCents));
  metrics.push({
    key: "moneyLeft",
    tone: left >= 0 ? "good" : "watch",
    valueCents: left,
    fact:
      left >= 0
        ? `You kept ${formatCents(left)} ${now}.`
        : `You spent ${formatCents(-left)} more than you got ${now}.`,
  });

  if (previousDays.length > 0) {
    const diff = left - sum(previousDays.map((d) => d.leftCents));
    metrics.push({
      key: "moneyLeftChange",
      tone: diff >= 0 ? "good" : "watch",
      valueCents: diff,
      fact:
        diff >= 0
          ? `You kept ${formatCents(diff)} more than ${BEFORE[range]}.`
          : `You kept ${formatCents(-diff)} less than ${BEFORE[range]}.`,
    });
  }

  const qtyById = new Map<string, number>();
  for (const p of itemSales)
    qtyById.set(p.menuItemId, (qtyById.get(p.menuItemId) ?? 0) + p.qtySold);
  const sold = menu
    .map((item) => ({ item, qty: qtyById.get(item.id) ?? 0 }))
    .sort((a, b) => b.qty - a.qty);

  if (sold.length > 0) {
    const { item, qty } = sold[0];
    metrics.push({
      key: "bestSeller",
      tone: "good",
      count: qty,
      menuItemId: item.id,
      fact: `${item.name} sold the most: ${qty} ${now}.`,
    });

    const earner = sold
      .map(({ item, qty }) => ({ item, cents: (item.priceCents - item.costCents) * qty }))
      .sort((a, b) => b.cents - a.cents)[0];
    metrics.push({
      key: "bestEarner",
      tone: "good",
      valueCents: earner.cents,
      menuItemId: earner.item.id,
      fact: `${earner.item.name} made you the most money: ${formatCents(earner.cents)} ${now}.`,
    });
  }

  if (sold.length > 1) {
    const { item, qty } = sold[sold.length - 1];
    metrics.push({
      key: "slowSeller",
      tone: "neutral",
      count: qty,
      menuItemId: item.id,
      fact: `${item.name} sold the least: ${qty} ${now}.`,
    });
  }

  const low = menu
    .filter((i) => i.stock <= i.reorderLevel)
    .sort((a, b) => a.stock / (a.reorderLevel || 1) - b.stock / (b.reorderLevel || 1));
  metrics.push({
    key: "lowStock",
    tone: low.length > 0 ? "watch" : "good",
    count: low.length,
    menuItemId: low[0]?.id,
    fact:
      low.length > 0
        ? `${plural(low.length, "item")} running low: ${low.map((i) => i.name).join(", ")}.`
        : "All items have enough stock.",
  });

  const dayCount = Math.max(days.length, 1);
  const runway = sold
    .filter(({ qty }) => qty > 0)
    .map(({ item, qty }) => ({ item, days: Math.floor(item.stock / (qty / dayCount)) }))
    .sort((a, b) => a.days - b.days)[0];
  if (runway) {
    metrics.push({
      key: "runningOut",
      tone: runway.days <= 3 ? "watch" : "neutral",
      count: runway.days,
      menuItemId: runway.item.id,
      fact:
        runway.days < 1
          ? `${runway.item.name} will run out today.`
          : `${runway.item.name} will run out in about ${plural(runway.days, "day")}.`,
    });
  }

  const costByType = new Map<ExpenseType, number>();
  for (const e of expenses) costByType.set(e.type, (costByType.get(e.type) ?? 0) + e.amountCents);
  const biggest = [...costByType].sort((a, b) => b[1] - a[1])[0];
  if (biggest) {
    metrics.push({
      key: "biggestCost",
      tone: "neutral",
      valueCents: biggest[1],
      fact: `Your biggest cost ${now} was ${COST_WORDS[biggest[0]]}: ${formatCents(biggest[1])}.`,
    });
  }

  return metrics;
}
