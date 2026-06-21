import { createHmac, timingSafeEqual } from "crypto";
import { normalizeMarketingEmail } from "./store";

function getSecret(): string {
  return (
    process.env.MARKETING_UNSUBSCRIBE_SECRET?.trim() ||
    process.env.OWNER_PIN?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    "trove-marketing-dev"
  );
}

export function signUnsubscribeToken(email: string): string {
  return createHmac("sha256", getSecret())
    .update(normalizeMarketingEmail(email))
    .digest("base64url");
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = signUnsubscribeToken(email);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(email: string): string {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://trove-us.com";
  const normalized = normalizeMarketingEmail(email);
  const token = signUnsubscribeToken(normalized);
  const params = new URLSearchParams({
    email: normalized,
    token,
  });
  return `${site}/unsubscribe?${params.toString()}`;
}
