import { syncMailchimpSubscriber } from "./mailchimp";
import {
  getSubscriber,
  normalizeMarketingEmail,
  saveSubscriber,
} from "./store";
import type { MarketingSource, MarketingSubscriber } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidMarketingEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeMarketingEmail(email));
}

export async function subscribeToMarketing(input: {
  email: string;
  fullName?: string;
  source: MarketingSource;
}): Promise<MarketingSubscriber> {
  const email = normalizeMarketingEmail(input.email);
  if (!isValidMarketingEmail(email)) {
    throw new Error("Please enter a valid email address.");
  }

  const now = new Date().toISOString();
  const existing = await getSubscriber(email);
  const subscriber: MarketingSubscriber = {
    email,
    fullName: input.fullName?.trim() || existing?.fullName,
    status: "subscribed",
    source: existing?.source ?? input.source,
    subscribedAt: existing?.subscribedAt ?? now,
    unsubscribedAt: undefined,
    updatedAt: now,
  };

  await saveSubscriber(subscriber);

  void syncMailchimpSubscriber({
    email,
    fullName: subscriber.fullName,
    status: "subscribed",
  }).catch((err) => {
    console.error("[marketing] Mailchimp subscribe failed:", err);
  });

  return subscriber;
}

export async function unsubscribeFromMarketing(
  email: string,
): Promise<MarketingSubscriber | null> {
  const normalized = normalizeMarketingEmail(email);
  const existing = await getSubscriber(normalized);
  if (!existing) return null;

  const now = new Date().toISOString();
  const subscriber: MarketingSubscriber = {
    ...existing,
    status: "unsubscribed",
    unsubscribedAt: now,
    updatedAt: now,
  };

  await saveSubscriber(subscriber);

  void syncMailchimpSubscriber({
    email: normalized,
    fullName: subscriber.fullName,
    status: "unsubscribed",
  }).catch((err) => {
    console.error("[marketing] Mailchimp unsubscribe failed:", err);
  });

  return subscriber;
}
