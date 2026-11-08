import { HttpError, readJson } from "@/lib/api";
import { writeLearnHints } from "@/lib/integrations/gemini";
import { fallbackHints, mergeHints, slipSentence, type LearnQuestion } from "@/lib/learn";
import { loadLearnQuestion, saysAnswerInWords } from "@/lib/learn-data";
import { formatCents } from "@/lib/money";

// Body: { transactionId, kind: "add" | "change", step?: number (default 0), wrongCents }
// -> { hints: [3 strings], fromGemini: 0-3 }
// Hints that help a little more each time but never say the answer. The server rebuilds the question
// from the real transaction (the browser cannot pick prices or answers). Gemini words the hints;
// src/lib/learn.ts checks every one (short, no made-up numbers, never the answer in digits), the
// route also rejects the answer written in words, and any gap is filled with a fixed hint. Nothing is written anywhere.

const DAY_MS = 86_400_000;
const cache = new Map<string, { at: number; value: { hints: string[]; fromGemini: number } }>();

/** A short description of the tablet screen, so a hint can point at it. */
function describeScreen(q: LearnQuestion): string {
  const buttons = "Under it, three answer buttons with amounts. They tapped one.";
  if (q.op === "times")
    return `The price of one (${formatCents(q.unitCents ?? 0)}) next to a picture of ${q.rightLabel}, and a question mark for the total. ${buttons}`;
  if (q.op === "single") return `A tile with one thing, ${q.leftLabel}, and its price. ${buttons}`;
  if (q.op === "plus")
    return `Two prices with pictures: ${q.leftLabel} ${formatCents(q.leftCents)} and ${q.rightLabel} ${formatCents(q.rightCents)}. ${buttons}`;
  return `The money the customer gave (${formatCents(q.leftCents)}) and what it costs (${formatCents(q.rightCents)})${q.pretend ? ", on a card sale (pretend they paid cash)" : ""}, then three answer buttons with amounts for the change. They tapped one.`;
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const { tx, q, kind, step } = await loadLearnQuestion(body);
    const wrong = body.wrongCents;
    if (
      !Number.isInteger(wrong) ||
      !q.choices.includes(wrong as number) ||
      wrong === q.correctCents
    )
      throw new HttpError("wrongCents must be one of the wrong choices");
    const wrongCents = wrong as number;

    const key = `${tx.id}:${kind}:${step}:${wrongCents}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < DAY_MS) return Response.json(hit.value);

    const candidate = await writeLearnHints({
      ask: q.ask,
      facts: q.facts,
      screen: describeScreen(q),
      mistake: slipSentence(q, wrongCents),
      kind,
      op: q.op,
      method: q.method,
    });
    // Also drop any hint that says the answer in words ("it makes nine dollars"): the shared check
    // only sees digits. mergeHints replaces an empty one with the fixed hint for that step.
    const safe = candidate?.map((h) => (saysAnswerInWords(h, q) ? "" : h)) ?? null;
    const value = mergeHints(safe, q, fallbackHints(q, wrongCents));
    if (value.fromGemini > 0) cache.set(key, { at: Date.now(), value });
    return Response.json(value);
  } catch (err) {
    if (err instanceof HttpError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error(err);
    return Response.json({ error: "Could not make hints" }, { status: 500 });
  }
}
