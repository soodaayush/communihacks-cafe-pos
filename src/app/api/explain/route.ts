import { explainNumbers } from "@/lib/explain";
import type { ExplainRequest, ExplainResponse } from "@/lib/types";

// TODO(dev3): validate the body.
export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => ({ topic: "money", numbers: {} }))) as ExplainRequest;
  return Response.json({ text: explainNumbers(body) } satisfies ExplainResponse);
}
