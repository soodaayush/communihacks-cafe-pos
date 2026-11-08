// Server-only. The staff PIN: changing stock or money needs a staff member; ringing up a sale does not.
//
// Set STAFF_PIN in .env.local to turn it on (unset = everything stays open, as before). The right PIN
// gets a signed cookie that lasts an hour, so a staff member types it once, not on every save.
// The cookie is signed with the PIN and a server secret: it cannot be made by hand or traced back to
// the PIN, and changing the PIN logs everyone out.
import { createHmac, timingSafeEqual } from "node:crypto";

export const STAFF_COOKIE = "cafe_staff";
export const STAFF_HOURS = 1;

const pin = () => process.env.STAFF_PIN?.trim() || null;

/** True when a PIN is set, so the Stock and Money changes need it. */
export const staffPinNeeded = () => pin() !== null;

const secret = () =>
  `${pin()}|${process.env.STAFF_SECRET ?? process.env.DATABASE_URL ?? "kw-habilitation-cafe"}`;
const sign = (expires: number) =>
  createHmac("sha256", secret()).update(`staff:${expires}`).digest("base64url");

/** Same-length, constant-time comparison (hash both first), so timing gives nothing away. */
function same(a: string, b: string): boolean {
  const h = (s: string) => createHmac("sha256", "staff-pin").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

export function pinIsRight(given: unknown): boolean {
  const p = pin();
  return p !== null && typeof given === "string" && same(given, p);
}

/** The cookie a staff member gets for the right PIN: "<expires>.<signature>". */
export function staffToken(now = Date.now()): string {
  const expires = now + STAFF_HOURS * 3_600_000;
  return `${expires}.${sign(expires)}`;
}

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export function isStaff(request: Request, now = Date.now()): boolean {
  if (!staffPinNeeded()) return true;
  const token = readCookie(request, STAFF_COOKIE);
  const [expires, signature] = token?.split(".") ?? [];
  const at = Number(expires);
  return Number.isFinite(at) && at > now && !!signature && same(signature, sign(at));
}

/**
 * Put first in a route that changes stock or money. Returns null when allowed; otherwise a 401
 * that the page answers by showing the PIN pad (see staffFetch in lib/staff-client.ts).
 */
export function staffOnly(request: Request): Response | null {
  return isStaff(request)
    ? null
    : Response.json(
        { error: "A staff member needs to type the PIN", staff: true },
        { status: 401 },
      );
}
