"use client";

import { Icon } from "@/components/icons/Icon";
import { playSound, setSoundsOn, useSoundsOn } from "@/lib/sounds";

/** Turns the app's little sound effects on or off. Remembered on this device. */
export function SoundToggle() {
  const on = useSoundsOn();
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={
        on ? "Sounds are on. Tap to turn them off." : "Sounds are off. Tap to turn them on."
      }
      title={on ? "Sounds on" : "Sounds off"}
      data-sound="none"
      onClick={() => {
        setSoundsOn(!on);
        if (!on) setTimeout(() => playSound("success"), 50); // a little hello when turned on
      }}
      className={`flex size-touch shrink-0 items-center justify-center self-center rounded-full ring-1 ring-ink/15 ${on ? "bg-white" : "bg-white/40 text-ink-soft"}`}
    >
      <Icon name={on ? "volume" : "volumeOff"} className="size-8" />
    </button>
  );
}
