import { SpeakButton } from "@/components/voice/SpeakButton";
import type { Insight, InsightTone } from "@/lib/types";

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
        className={`flex size-14 shrink-0 items-center justify-center rounded-full text-3xl ${TONE_BG[insight.tone]}`}
      >
        {insight.icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg leading-tight font-bold">{insight.headline}</h3>
        <p className="text-base leading-snug">{insight.sentence}</p>
      </div>
      <SpeakButton text={`${insight.headline}. ${insight.sentence}`} />
    </article>
  );
}
