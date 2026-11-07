"use client";

import { speak } from "@/lib/speech";

export interface SpeakButtonProps {
  text: string;
  label?: string;
}

/** Reads `text` aloud with the browser's voice. */
export function SpeakButton({ text, label = "Read out loud" }: SpeakButtonProps) {
  return (
    <button
      type="button"
      onClick={() => speak(text)}
      aria-label={label}
      className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-ink/10 transition-transform motion-safe:active:scale-95"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-8"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
      </svg>
    </button>
  );
}
