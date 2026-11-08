"use client";

import { useEffect } from "react";
import { playSound, preloadSounds, soundForButton } from "@/lib/sounds";

/**
 * Gives the buttons their sounds, in one place. Any button that adds or removes ("One more", "Add $20",
 * "50 less"...) is recognised by its label; any other button can opt in with data-sound="add".
 * Disabled buttons are silent, and so is everything while sounds are switched off.
 */
export function SoundProvider() {
  useEffect(() => {
    preloadSounds();
    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLElement>(
        "button, [role=button]",
      );
      if (
        !button ||
        (button as HTMLButtonElement).disabled ||
        button.getAttribute("aria-disabled") === "true"
      )
        return;
      const sound = soundForButton(button);
      if (sound) playSound(sound);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
