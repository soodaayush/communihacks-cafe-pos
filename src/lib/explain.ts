import type { ExplainRequest } from "./types";
import { formatCents } from "./money";

// Local, rule-based explanations in very simple words (no external AI service).
// TODO(dev3): write short sentences per topic; keep them speakable via src/lib/speech.ts.
export function explainNumbers({ topic, numbers }: ExplainRequest): string {
  if (topic === "money" && numbers.leftCents !== undefined) {
    return `You have ${formatCents(numbers.leftCents)} left.`;
  }
  return "Money came in. Some money went out. The rest is yours to keep.";
}
