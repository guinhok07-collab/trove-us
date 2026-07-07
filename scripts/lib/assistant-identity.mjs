/** Nome da assistente (feminino) — wake word e branding. */
export function ownerName() {
  return process.env.META_OWNER_NAME?.trim() || "Igor";
}

/** Cumprimento correto pelo relógio local (Brasil: noite a partir das 18h). */
export function localTimeContext(base = new Date()) {
  const h = base.getHours();
  const m = base.getMinutes();
  let period;
  if (h >= 5 && h < 12) period = "Bom dia";
  else if (h >= 12 && h < 18) period = "Boa tarde";
  else period = "Boa noite";

  return {
    hour: h,
    minute: m,
    period,
    formatted: base.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    dateLabel: base.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }),
  };
}

export function timeGreeting(base = new Date()) {
  return localTimeContext(base).period;
}

/** Corrige "Bom dia" de mensagem velha quando já é noite. */
export function alignGreetingPeriod(text, base = new Date()) {
  const t = String(text || "").trim();
  if (!t) return t;
  const { period } = localTimeContext(base);
  return t.replace(/^(Bom dia|Boa tarde|Boa noite)\b/i, period);
}

export function assistantName() {
  return process.env.META_ASSISTANT_NAME?.trim() || "Aria";
}

/** Variações que o microfone pode captar em pt-BR */
/** Modo Alexa — assistente de PC/casa (música, YouTube, apps). */
export function isAlexaModeEnabled() {
  const v = process.env.ARIA_ALEXA_MODE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function assistantWakeWords() {
  const name = assistantName().toLowerCase();
  const extra = (process.env.META_ASSISTANT_ALIASES || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const alexa = isAlexaModeEnabled()
    ? ["alexa", "alexia", "álexia", "alexia", "aléxia"]
    : [];
  return [...new Set([name, "ária", "aria", "arya", "área", ...alexa, ...extra])];
}

export function isWakeOnlyUtterance(raw) {
  const t = String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const words = assistantWakeWords().map((w) =>
    w.normalize("NFD").replace(/\p{M}/gu, ""),
  );
  for (const w of words) {
    if (new RegExp(`^(oi|ola|olá|hey|ei|eai|fala)?\\s*${w}[!.?\\s]*$`, "i").test(t)) {
      return true;
    }
  }
  return false;
}

/** Remove o nome da assistente do início do comando. */
export function stripWakeWord(raw) {
  let q = String(raw || "").trim();
  const words = assistantWakeWords();
  for (const w of words) {
    const re = new RegExp(
      `^(oi|olá|ola|hey|ei|eai|fala)?\\s*${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[,!\\s]+`,
      "i",
    );
    q = q.replace(re, "").trim();
    const only = new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    if (only.test(q)) return "";
  }
  return q || String(raw || "").trim();
}

export function utteranceHasWakeWord(raw) {
  const t = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return assistantWakeWords().some((w) => {
    const n = w.normalize("NFD").replace(/\p{M}/gu, "");
    return t.includes(n);
  });
}
