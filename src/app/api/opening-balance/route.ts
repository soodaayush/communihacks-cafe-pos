import { HttpError, readJson } from "@/lib/api";
import { cafeDate } from "@/lib/cafe-time";
import { OPENING_BALANCE, getSetting, setSetting, type OpeningBalance } from "@/lib/settings";
import { staffOnly } from "@/lib/staff";

// GET  /api/opening-balance                 -> { month, cents } | null
// POST /api/opening-balance { month, cents } -> { month, cents }   (staff PIN, if one is set)
// "On the 1st of this month the café had $X." Money › This month carries every balance from it.

const MAX_CENTS = 9_999_900; // $99,999, the most the number pad takes

export async function GET() {
  return Response.json(await getSetting<OpeningBalance>(OPENING_BALANCE));
}

export async function POST(request: Request) {
  const denied = staffOnly(request);
  if (denied) return denied;
  try {
    const { month, cents } = await readJson(request);
    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new HttpError("month must look like 2026-11");
    if (month > cafeDate().slice(0, 7)) throw new HttpError("month cannot be in the future");
    if (!Number.isInteger(cents) || (cents as number) < 0 || (cents as number) > MAX_CENTS)
      throw new HttpError(`cents must be a whole number from 0 to ${MAX_CENTS}`);
    return Response.json(
      await setSetting<OpeningBalance>(OPENING_BALANCE, { month, cents: cents as number }),
    );
  } catch (err) {
    if (err instanceof HttpError)
      return Response.json({ error: err.message }, { status: err.status });
    console.error(err);
    return Response.json({ error: "Database error" }, { status: 500 });
  }
}
