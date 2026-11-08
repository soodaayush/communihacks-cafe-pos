// Server-only (uses GEMINI_API_KEY). Never import from a client component.
import { GoogleGenAI } from "@google/genai";
import type { Metric, MetricKey } from "@/lib/types";

export interface GeminiInsight {
  metricKey: MetricKey;
  icon: string;
  headline: string;
  sentence: string;
}

// Tried in order; the next one is used if a model is busy or slow. VERIFY against docs: model ids.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", "gemini-3.5-flash"].filter(
  (m, i, all) => all.indexOf(m) === i,
);

const SYSTEM = `You help a café cashier who has an intellectual disability understand how the café is doing.
They find math hard and do not know words like profit, revenue, margin, expense, inventory or percent.

You get a list of facts. Every fact is already correct.
Pick the facts that matter most. Put things that need action first (running out, low stock, losing money), then good news.

For each fact you pick, write:
- icon: one emoji that shows the idea.
- headline: 2 to 5 easy words.
- sentence: one sentence, 12 words or fewer, very easy words, like talking to a friend.

Rules:
- Only use numbers that appear in that same fact. Never add, subtract, round or guess numbers.
- No percentages. No hard words. Say "money you kept", not "profit".
- Be kind and calm. Never scary.`;

let client: GoogleGenAI | undefined;

/** Returns null when Gemini is not configured or fails; callers fall back to local wording. */
export async function pickInsights(metrics: Metric[], max = 3): Promise<GeminiInsight[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || metrics.length === 0) return null;
  // Per-model timeout. Gemini rejects anything under 10s.
  client ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: 12_000 } });

  for (const model of MODELS) {
    const insights = await tryModel(client, model, metrics, max);
    if (insights) return insights;
  }
  return null;
}

async function tryModel(client: GoogleGenAI, model: string, metrics: Metric[], max: number) {
  try {
    // VERIFY against docs: https://ai.google.dev/gemini-api/docs/structured-output
    const response = await client.models.generateContent({
      model,
      contents: JSON.stringify({
        facts: metrics.map(({ key, tone, fact }) => ({ key, tone, fact })),
      }),
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            insights: {
              type: "array",
              minItems: 1,
              maxItems: max,
              items: {
                type: "object",
                properties: {
                  metricKey: { type: "string", enum: metrics.map((m) => m.key) },
                  icon: { type: "string" },
                  headline: { type: "string" },
                  sentence: { type: "string" },
                },
                required: ["metricKey", "icon", "headline", "sentence"],
              },
            },
          },
          required: ["insights"],
        },
      },
    });
    const parsed = JSON.parse(response.text ?? "{}") as { insights?: GeminiInsight[] };
    return Array.isArray(parsed.insights) ? parsed.insights : null;
  } catch (err) {
    console.warn(
      `[gemini] ${model} failed:`,
      err instanceof Error ? err.message.slice(0, 200) : err,
    );
    return null;
  }
}

// ---------------------------------------------------------------------------------------------
// Learn: practise the arithmetic of real transactions (src/lib/learn.ts). Gemini only WORDS hints
// and explanations. It never decides what is right, and src/lib/learn.ts checks every line it
// writes (isGoodHint / isGoodExplanation) before anyone sees it.

/** One JSON answer from the first model that works; null if Gemini is off, busy or breaks the format. */
async function askJson<T>(system: string, contents: string, schema: unknown): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  // Per-model timeout. Gemini rejects anything under 10s.
  client ??= new GoogleGenAI({ apiKey, httpOptions: { timeout: 12_000 } });
  for (const model of MODELS) {
    try {
      // VERIFY against docs: https://ai.google.dev/gemini-api/docs/structured-output
      const response = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system,
          temperature: 0.4,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
        },
      });
      return JSON.parse(response.text ?? "null") as T;
    } catch (err) {
      console.warn(
        `[gemini] ${model} failed:`,
        err instanceof Error ? err.message.slice(0, 200) : err,
      );
    }
  }
  return null;
}

export interface LearnHintRequest {
  /** The question as the cashier sees it, e.g. "$2.50 + $2.50 = ?" or "How much change?" */
  ask: string;
  /** Plain facts about this exact question. */
  facts: string;
  /** What is on the tablet screen, so a hint can point at it. */
  screen: string;
  /** What they got wrong, in plain words. */
  mistake: string;
  kind: "add" | "change";
  /** plus (two amounts), times (several of the same thing), single (one thing), change. */
  op: "plus" | "times" | "single" | "change";
  /** The method the hints must teach (LearnQuestion.method). */
  method: string;
}

const LEARN_TUTOR = `You are a patient teacher for an adult who runs a café cashier desk and has an intellectual disability.
They find reading and maths hard. They are practising the arithmetic of real sales: adding prices, counting several of the same thing, and working out change.

They tapped a wrong answer. Write exactly 3 hints, like Khan Academy hints:
- Hint 1 speaks to their exact mistake, kindly and plainly.
- Hint 2 helps a bit more.
- Hint 3 helps the most, but still lets them find the answer themselves.

Teach the method named in "method", using the money in front of them. The question type is "op":
- plus (count on): start with the bigger price, then count up by the other price. Dollars first, then coins.
- times (skip count): several of the same thing. NEVER multiply for them and never say "times". Point at counting up by the price once for each one. If the facts list the first counts, a hint may use them.
- single (read the price): there is one thing, and the total is its price. Only point at the price on the tile.
- change (count up): start at the cost, then count up to what the customer gave. Count up to the next dollar first. If the facts say "Pretend they paid cash", a hint may say to pretend they paid cash.

Rules for every hint:
- NEVER say the answer. Never say the total, the change, or any amount that is the answer.
- 12 words or fewer. One short sentence. Very easy, everyday words.
- Only use numbers that are written in the facts. Never make up a number.
- Write every number as digits, like $2.50 or 3. Never write a number as a word.
- No hard words: no profit, revenue, subtract, minus, multiply, equation, calculate, percent.
- Speak to an adult, calm and respectful. Not childish. Never say "oops" or "great job".

Good hints, by method:
- count on: "That is only one of the two prices. Add both." / "Start with the bigger price. Count up from there."
- skip count: "That is only one. Count every one." / "Count up by the price, once for each one." / "Count by $2.50: $2.50, $5.00. Keep going."
- read the price: "There is only one thing." / "Look at the price on the tile."
- count up: "Start at the cost. Count up to what they gave." / "Count up to the next dollar first." / "That is what they gave. Change is what they get back."`;

/** Three hints for one mistake, or null if Gemini is unavailable (callers use fixed hints). */
export async function writeLearnHints(req: LearnHintRequest): Promise<string[] | null> {
  const parsed = await askJson<{ hints?: unknown }>(LEARN_TUTOR, JSON.stringify(req), {
    type: "object",
    properties: {
      hints: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
    },
    required: ["hints"],
  });
  return parsed && Array.isArray(parsed.hints) ? parsed.hints.map(String) : null;
}

export interface LearnExplainRequest {
  facts: string;
  /** The right answer, written as money, e.g. "$5.00". This one may be said. */
  answer: string;
  kind: "add" | "change";
  op: "plus" | "times" | "single" | "change";
  method: string;
}

const LEARN_EXPLAINER = `You are a patient teacher for an adult who runs a café cashier desk and has an intellectual disability.
They have just got a money question right. Show them how the answer is made, so it sticks.

Rules:
- At most 22 words. One or two short sentences. Very easy, everyday words.
- Show the steps with the method named in "method". The question type is "op":
  plus: start with the bigger price and count up by the other;
  times: several of the same thing: say you count up by the price once for each one, and where you end (never say "times", never multiply out loud);
  single: it is one thing, so the total is its price;
  change: start at the cost and count up to what the customer gave (on a card sale, they pretended it was cash).
- Use only numbers that are written in the facts, or the answer. Never make up a number.
  Do not list the numbers you count through (no "10, 15, 20"): name where you start and where you end.
- Write every number as digits, like $5.00 or 3. Never write a number as a word.
- No hard words: no profit, revenue, subtract, minus, multiply, equation, calculate, percent.
- Speak to an adult, calm and respectful. Not childish. Do not praise ("great job").`;

/** One short sentence or two showing how the answer is made, or null if Gemini is unavailable. */
export async function writeExplanation(req: LearnExplainRequest): Promise<string | null> {
  const parsed = await askJson<{ text?: unknown }>(LEARN_EXPLAINER, JSON.stringify(req), {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  });
  return parsed && typeof parsed.text === "string" ? parsed.text : null;
}
