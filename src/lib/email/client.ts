import { Resend } from "resend";
import { brand } from "@/data/brand";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? `${brand.name} <onboarding@resend.dev>`;
}

/** Resend test sender only delivers to the account owner inbox. */
function resolveRecipient(originalTo: string, subject: string, html: string, text: string) {
  const from = getFromAddress();
  const testInbox = process.env.RESEND_TEST_INBOX?.trim();
  const usingTestSender = from.includes("onboarding@resend.dev");

  if (!usingTestSender || !testInbox) {
    return { to: originalTo, subject, html, text };
  }

  if (originalTo.toLowerCase() === testInbox.toLowerCase()) {
    return { to: originalTo, subject, html, text };
  }

  return {
    to: testInbox,
    subject: `[Test copy for ${originalTo}] ${subject}`,
    html: `<p style="color:#78716c;font-size:13px;">Resend test mode — this would go to <strong>${originalTo}</strong> after domain verification.</p>${html}`,
    text: `Resend test mode — would send to ${originalTo}\n\n${text}`,
  };
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; id?: string; error?: string; deliveredTo?: string }> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY not set — skipping:", input.subject);
    return { ok: false, error: "Email not configured" };
  }

  const resolved = resolveRecipient(input.to, input.subject, input.html, input.text);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: getFromAddress(),
    to: resolved.to,
    replyTo: brand.supportEmail,
    subject: resolved.subject,
    html: resolved.html,
    text: resolved.text,
  });

  if (error) {
    console.error("[email]", error.message, "to:", resolved.to);
    return { ok: false, error: error.message, deliveredTo: resolved.to };
  }

  return { ok: true, id: data?.id, deliveredTo: resolved.to };
}
