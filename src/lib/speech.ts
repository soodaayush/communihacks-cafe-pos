// Client-only. Reads text aloud with the browser's built-in Web Speech API (no external service).

/**
 * Converts money formats (e.g. "$4.50", "$2", "$1,326.00") and dollar symbols
 * into clear natural English words for speech synthesis.
 * E.g., "$4.50" -> "four dollars and fifty cents", "$2" -> "two dollars".
 */
export function speakableText(text: string): string {
  // Replace dollar amounts like $1,326.50 or $4.50 or $5
  return text
    .replace(/\$(\d+(?:,\d{3})*)\.(\d{2})\b/g, (_match, dollars, cents) => {
      const dNum = parseInt(dollars.replace(/,/g, ""), 10);
      const cNum = parseInt(cents, 10);
      const dWord = dNum === 1 ? "1 dollar" : `${dNum} dollars`;
      if (cNum === 0) return dWord;
      const cWord = cNum === 1 ? "1 cent" : `${cNum} cents`;
      return `${dWord} and ${cWord}`;
    })
    .replace(/\$(\d+(?:,\d{3})*)\b/g, (_match, dollars) => {
      const dNum = parseInt(dollars.replace(/,/g, ""), 10);
      return dNum === 1 ? "1 dollar" : `${dNum} dollars`;
    })
    .replace(/(\d+)\s*¢/g, (_match, cents) => {
      const cNum = parseInt(cents, 10);
      return cNum === 1 ? "1 cent" : `${cNum} cents`;
    })
    .replace(/\s*−\s*/g, " minus ")
    .replace(/\s*\+\s*/g, " plus ")
    .replace(/\s*=\s*/g, " equals ");
}

export function speak(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(speakableText(text));
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  
  // Choose an English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en-CA") || v.lang.startsWith("en-US") || v.lang.startsWith("en"),
  );
  if (preferred) {
    utterance.voice = preferred;
  }
  
  window.speechSynthesis.speak(utterance);
}
