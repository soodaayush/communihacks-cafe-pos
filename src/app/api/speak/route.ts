import { speakableText } from "@/lib/speech";
import type { SpeakRequest, SpeakResponse } from "@/lib/types";

// Speech runs in the browser (src/lib/speech.ts). This route returns the normalized text to read.
export async function POST(request: Request) {
  const { text = "" } = (await request.json().catch(() => ({}))) as Partial<SpeakRequest>;
  return Response.json({
    engine: "browser",
    text: speakableText(text),
  } satisfies SpeakResponse);
}
