// Client-only. Reads text aloud with the browser's built-in Web Speech API (no external service).
// TODO(dev3): choose voice, rate and pitch; say money as words ("two dollars"), not "$2.00".
export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
