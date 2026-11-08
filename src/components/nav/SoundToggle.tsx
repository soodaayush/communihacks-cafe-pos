"use client";

import { Icon } from "@/components/icons/Icon";
import { playSound, setSoundsOn, useSoundsOn } from "@/lib/sounds";
import { stopSpeaking } from "@/lib/speech";

/**
 * One switch for everything you hear: the read-aloud voice (every speaker button on the site shows or
 * hides with it) and the little button sounds. Remembered on this device.
 */
export function SoundToggle() {
  const on = useSoundsOn();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={
        on
          ? "Voice and sounds are on. Tap to turn them off."
          : "Voice and sounds are off. Tap to turn them on."
      }
      title={on ? "Voice on" : "Voice off"}
      data-sound="none"
      onClick={() => {
        if (on) {
          stopSpeaking();
          playSound("mute"); // played while sounds are still on
        }
        setSoundsOn(!on);
        if (!on) setTimeout(() => playSound("success"), 50); // a little hello when turned on
      }}
      className={`flex size-touch shrink-0 items-center justify-center self-center rounded-full transition-colors ${on ? "bg-sage/60 text-ink" : "bg-ink/5 text-ink-soft"}`}
    >
      <Icon name={on ? "volume" : "volumeOff"} className="size-8" />
    </button>
  );
}
