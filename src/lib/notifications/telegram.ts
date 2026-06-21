export type TelegramAlertKind =
  | "sale"
  | "return"
  | "order_issue"
  | "system";

const SUBJECT: Record<TelegramAlertKind, string> = {
  sale: "🛒 Nova venda",
  return: "↩️ Devolução / problema na compra",
  order_issue: "⚠️ Problema no pedido",
  system: "ℹ️ Trove — aviso",
};

export function isTelegramConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim(),
  );
}

export async function sendTelegramAlert(
  kind: TelegramAlertKind,
  body: string,
  extraSubject?: string,
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const headline = extraSubject
    ? `${SUBJECT[kind]} — ${extraSubject}`
    : SUBJECT[kind];
  const text = `${headline}\n\n${body}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[telegram]", kind, res.status, await res.text());
    return false;
  }

  return true;
}

export function formatAlertTime(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}
