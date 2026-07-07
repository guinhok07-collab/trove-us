/**
 * Modo Alexa — Aria vira assistente de casa/PC (música, YouTube, apps).
 */
import { isAlexaModeEnabled, assistantName } from "./assistant-identity.mjs";

export { isAlexaModeEnabled as isAlexaMode };

/** Resposta curta estilo Alexa. */
export function alexaStyleReply(message) {
  const name = assistantName();
  return {
    ok: true,
    instant: true,
    model: "alexa-local",
    answer: message,
    jarvisQuip: "Feito.",
    assistantName: name,
    alexaMode: true,
  };
}

/** Comandos que executam no PC sem esperar GPT (estilo Alexa). */
export function isAlexaLocalCommand(question) {
  const q = String(question || "").toLowerCase();
  return (
    /m[uú]sica|youtube|spotify|volume|brilho|som\b|abre|abr[ae]|toca|coloca|p[oõ]e|play\b|pausa|para a|pr[oó]xim|pesquisa|busca|google|tranca|bloqueia|modo alexa|modo aria|capacidades|diagn[oó]stico pc|assiste|mostra|quero ouvir|bota|coloca|chrome|navegador|netflix|whatsapp/i.test(
      q,
    )
  );
}
