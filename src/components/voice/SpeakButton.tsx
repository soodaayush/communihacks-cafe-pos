"use client";

import { useEffect, useState } from "react";
import { useSoundsOn, voiceJustToggled } from "@/lib/sounds";
import { speak, stopSpeaking, type SpeakState } from "@/lib/speech";

export interface SpeakButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "size-10",
  md: "size-12",
  lg: "size-16",
};

const ICON_SIZE_CLASSES = {
  sm: "size-5",
  md: "size-6",
  lg: "size-8",
};

/** Reads `text` aloud (ElevenLabs voice; the browser's voice if that is not available). Tap again to stop. */
export function SpeakButton({
  text,
  label = "Read out loud",
  size = "lg",
  className = "",
}: SpeakButtonProps) {
  const [state, setState] = useState<SpeakState>("idle");
  // The speaker switch in the nav bar: when the voice is off, no speaker buttons anywhere.
  // Flipping it makes them pop in, or shrink away first; on page load they just appear.
  const on = useSoundsOn();
  const [hidden, setHidden] = useState(!on);
  const [wasOn, setWasOn] = useState(on);
  if (on !== wasOn) {
    setWasOn(on);
    if (on) setHidden(false);
  }
  useEffect(() => {
    if (on) return;
    const t = setTimeout(() => setHidden(true), voiceJustToggled() ? 220 : 0);
    return () => clearTimeout(t);
  }, [on]);
  if (hidden) return null;
  const motion = voiceJustToggled() ? (on ? "speak-in" : "speak-out") : "";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (state === "idle") speak(text, setState);
        else stopSpeaking();
      }}
      aria-label={state === "idle" ? label : "Stop reading"}
      aria-pressed={state !== "idle"}
      aria-busy={state === "loading"}
      className={`${motion} flex shrink-0 items-center justify-center rounded-full ring-1 ring-ink/10 transition-transform motion-safe:active:scale-95 ${state === "idle" ? "bg-white" : "bg-sage"} ${state === "loading" ? "motion-safe:animate-pulse" : ""} ${SIZE_CLASSES[size]} ${className}`}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className={ICON_SIZE_CLASSES[size]}
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
