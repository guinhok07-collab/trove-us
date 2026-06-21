import { createHash } from "crypto";
import { normalizeMarketingEmail } from "./store";

function getMailchimpConfig() {
  const apiKey = process.env.MAILCHIMP_API_KEY?.trim();
  const listId = process.env.MAILCHIMP_LIST_ID?.trim();
  if (!apiKey || !listId) return null;

  const dc = apiKey.split("-").pop();
  if (!dc) return null;

  return {
    apiKey,
    listId,
    baseUrl: `https://${dc}.api.mailchimp.com/3.0`,
  };
}

export function isMailchimpConfigured(): boolean {
  return Boolean(getMailchimpConfig());
}

function subscriberHash(email: string): string {
  return createHash("md5").update(normalizeMarketingEmail(email)).digest("hex");
}

function splitName(fullName?: string): { FNAME?: string; LNAME?: string } {
  if (!fullName?.trim()) return {};
  const parts = fullName.trim().split(/\s+/);
  return {
    FNAME: parts[0],
    LNAME: parts.length > 1 ? parts.slice(1).join(" ") : undefined,
  };
}

export async function syncMailchimpSubscriber(input: {
  email: string;
  fullName?: string;
  status: "subscribed" | "unsubscribed";
}): Promise<void> {
  const config = getMailchimpConfig();
  if (!config) return;

  const hash = subscriberHash(input.email);
  const auth = Buffer.from(`trove:${config.apiKey}`).toString("base64");

  const res = await fetch(
    `${config.baseUrl}/lists/${config.listId}/members/${hash}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: normalizeMarketingEmail(input.email),
        status_if_new: "subscribed",
        status: input.status,
        merge_fields: splitName(input.fullName),
      }),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const json = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(json.detail || "Mailchimp sync failed.");
  }
}
