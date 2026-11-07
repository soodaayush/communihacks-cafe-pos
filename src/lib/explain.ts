import type { ExplainRequest } from "./types";
import { formatCents } from "./money";

// Local, rule-based explanations in very simple words (no external AI service).
export function explainNumbers({ topic, numbers }: ExplainRequest): string {
  if (topic === "money") {
    if (numbers.leftCents !== undefined) {
      if (numbers.leftCents < 0) {
        return `We spent ${formatCents(-numbers.leftCents)} more than we brought in.`;
      }
      return `You have ${formatCents(numbers.leftCents)} left to keep.`;
    }
    return "Customers paid for drinks and food. We bought supplies. What is left is ours to keep.";
  }

  if (topic === "trends") {
    return "These charts show what sells the most and what times are the busiest.";
  }

  return "Money came in. Some money went out. The rest is yours to keep.";
}
