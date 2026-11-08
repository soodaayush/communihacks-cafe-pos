import { HttpError, readJson } from "@/lib/api";
import { writeExplanation } from "@/lib/integrations/gemini";
import { fallbackExplanation, isGoodExplanation } from "@/lib/learn";
import { hasNumberWords, loadLearnQuestion } from "@/lib/learn-data";
import { formatCents } from "@/lib/money";

// Body: { transactionId, kind: "add" | "change", step?: number (default 0) }
// -> { text, fromGemini: boolean }
// Shown after the right answer: a short "why" that shows how the answer is made. Gemini words it;
// isGoodExplanation checks it (short, only numbers from the question or the answer), otherwise the
// fixed sentence is used. Nothing is written anywhere.

const DAY_MS = 86_400_000;
const cache = new Map<string, { at: number; value: { text: string; fromGemini: boolean } }>();

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const { tx, q, kind, step } = await loadLearnQuestion(body);

    const key = `${tx.id}:${kind}:${step}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < DAY_MS) return Response.json(hit.value);

    const written = await writeExplanation({
      facts: q.facts,
      answer: formatCents(q.correctCents),
      kind,
      op: q.op,
      method: q.method,
    });
    // Digits only: a number written as a word cannot be checked, so those fall back to the fixed sentence.
    const good = written !== null && isGoodExplanation(written, q) && !hasNumberWords(written);
    const value = { text: good ? written.trim() : fallbackExplanation(q), fromGemini: good };
    if (value.fromGemini) cache.set(key, { at: Date.now(), value });
    return Response.json(value);
  } catch (err) {
    if (err instanceof HttpError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error(err);
    return Response.json({ error: "Could not make an explanation" }, { status: 500 });
  }
}
