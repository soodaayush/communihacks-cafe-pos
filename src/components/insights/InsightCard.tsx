import { Icon, type IconName } from "@/components/icons/Icon";
import { SpeakButton } from "@/components/voice/SpeakButton";
import type { Insight, InsightTone, MetricKey } from "@/lib/types";

// The picture for each kind of insight. It follows the metric, not the text the AI wrote, so the
// pictures always match the rest of the app.
const PICTURE: Record<MetricKey, IconName> = {
  runningOut: "hourglass",
  lowStock: "boxes",
  moneyLeft: "coin",
  moneyLeftChange: "trendUp",
  bestSeller: "star",
  bestEarner: "trophy",
  biggestCost: "receipt",
  slowSeller: "turtle",
};

// Same look as the rest of the app: a white card; the tone shows in the icon's circle.
const TONE_BG: Record<InsightTone, string> = {
  good: "bg-sage",
  watch: "bg-butter",
  neutral: "bg-sky",
};

export interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <article className="flex items-center gap-4 rounded-2xl bg-cream p-3">
      <span
        aria-hidden
        className={`flex size-14 shrink-0 items-center justify-center rounded-full ${TONE_BG[insight.tone]}`}
      >
        <Icon
          name={
            insight.metricKey === "moneyLeftChange" && insight.tone === "watch"
              ? "trendDown"
              : PICTURE[insight.metricKey]
          }
          className="size-9"
        />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg leading-tight font-bold">{insight.headline}</h3>
        <p className="text-base leading-snug">{insight.sentence}</p>
      </div>
      <SpeakButton text={`${insight.headline}. ${insight.sentence}`} />
    </article>
  );
}
