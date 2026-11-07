import { SpeakButton } from "@/components/voice/SpeakButton";
import type { Insight, InsightTone } from "@/lib/types";

const TONE_BG: Record<InsightTone, string> = {
  good: "bg-sage",
  watch: "bg-butter",
  neutral: "bg-sky",
};

export interface InsightCardProps {
  insight: Insight;
}

// TODO(dev3): add a CoinBarVisual for valueCents and a picture of the menu item.
export function InsightCard({ insight }: InsightCardProps) {
  return (
    <article className={`flex items-center gap-gap rounded-tile p-6 ${TONE_BG[insight.tone]}`}>
      <span aria-hidden className="text-hero leading-none">
        {insight.icon}
      </span>
      <div className="flex-1">
        <h2 className="text-label font-semibold">{insight.headline}</h2>
        <p className="text-label">{insight.sentence}</p>
      </div>
      <SpeakButton text={`${insight.headline}. ${insight.sentence}`} />
    </article>
  );
}
