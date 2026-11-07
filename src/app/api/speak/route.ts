import type { SpeakRequest, SpeakResponse } from "@/lib/types";

// Speech runs in the browser (src/lib/speech.ts). This route only returns the text to read.
// TODO(dev3): turn numbers into speakable words here (e.g. 450 cents -> "four dollars fifty").
export async function POST(request: Request) {
  const { text = "" } = (await request.json().catch(() => ({}))) as Partial<SpeakRequest>;
  return Response.json({ engine: "browser", text } satisfies SpeakResponse);
}
