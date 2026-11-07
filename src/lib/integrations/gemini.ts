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
