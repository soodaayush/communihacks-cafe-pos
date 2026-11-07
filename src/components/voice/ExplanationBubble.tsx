import type { ExplainRequest } from "@/lib/types";

export interface ExplanationBubbleProps {
  request: ExplainRequest;
  /** Optional pre-fetched text from POST /api/explain. */
  text?: string;
}

// TODO(dev3): speech bubble with one short sentence + SpeakButton.
export function ExplanationBubble(_props: ExplanationBubbleProps) {
  return null;
}
