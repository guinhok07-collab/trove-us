import { createHmac, timingSafeEqual } from "crypto";

export const OWNER_COOKIE = "trove_owner";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7;

function signPayload(expiresMs: number, secret: string): string {
  return createHmac("sha256", secret).update(String(expiresMs)).digest("base64url");
}

/** Server-only PIN. Falls back to legacy public env during migration. */
export function getOwnerPin(): string | undefined {
  return (
    process.env.OWNER_PIN?.trim() ||
    process.env.NEXT_PUBLIC_ANALYTICS_PIN?.trim() ||
    undefined
  );
}

export function isOwnerPinConfigured(): boolean {
  return Boolean(getOwnerPin());
}

export function createOwnerSessionToken(): string | null {
  const secret = getOwnerPin();
  if (!secret) return null;

  const expires = Date.now() + SESSION_TTL_SEC * 1000;
  return `${expires}.${signPayload(expires, secret)}`;
}

export function verifyOwnerSessionToken(token: string | undefined | null): boolean {
  const secret = getOwnerPin();
  if (!secret) return true;
  if (!token) return false;

  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;

  const expires = Number(token.slice(0, dot));
  const sig = token.slice(dot + 1);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;

  const expected = signPayload(expires, secret);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyOwnerPin(pin: string): boolean {
  const secret = getOwnerPin();
  if (!secret) return true;

  try {
    const a = Buffer.from(pin);
    const b = Buffer.from(secret);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function ownerCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_SEC,
  };
}
