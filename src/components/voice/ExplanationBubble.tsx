"use client";

import { explainNumbers } from "@/lib/explain";
import type { ExplainRequest } from "@/lib/types";
import { SpeakButton } from "./SpeakButton";

export interface ExplanationBubbleProps {
  request: ExplainRequest;
  /** Optional pre-fetched text from POST /api/explain. */
  text?: string;
  className?: string;
}

/**
 * Speech bubble with a friendly, simple-words explanation and a SpeakButton.
 */
export function ExplanationBubble({ request, text, className = "" }: ExplanationBubbleProps) {
  const message = text || explainNumbers(request);

  return (
    <div
      role="region"
      aria-label="Audio explanation"
      className={`relative flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-ink/10 shadow-sm ${className}`}
    >
      <p className="min-w-0 flex-1 text-base leading-snug font-medium text-ink">
        {message}
      </p>
      <SpeakButton text={message} size="md" label="Listen to explanation" />
    </div>
  );
}
