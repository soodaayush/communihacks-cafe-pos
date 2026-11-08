import { cookies } from "next/headers";
import { perMinuteLimit } from "@/lib/rate-limit";
import {
  STAFF_COOKIE,
  STAFF_HOURS,
  isStaff,
  pinIsRight,
  staffPinNeeded,
  staffToken,
} from "@/lib/staff";

// GET  /api/staff         -> { needed, unlocked }  (is a PIN set? has this tablet typed it?)
// POST /api/staff { pin } -> 200 and an hour-long cookie, or 401 (wrong PIN), 429 (too many tries)

// A few tries a minute: a typo is fine, trying every PIN would take days.
const withinTries = perMinuteLimit("staffPin", 8);

export function GET(request: Request) {
  return Response.json({ needed: staffPinNeeded(), unlocked: isStaff(request) });
}

export async function POST(request: Request) {
  if (!staffPinNeeded()) return Response.json({ needed: false, unlocked: true });
  if (!withinTries())
    return Response.json({ error: "Too many tries. Wait one minute." }, { status: 429 });

  const { pin } = (await request.json().catch(() => ({}))) as { pin?: unknown };
  if (!pinIsRight(pin)) return Response.json({ error: "That PIN is not right." }, { status: 401 });

  (await cookies()).set(STAFF_COOKIE, staffToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STAFF_HOURS * 3600,
  });
  return Response.json({ needed: true, unlocked: true });
}
