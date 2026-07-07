#!/usr/bin/env node
/** Verifica apps necessários para Modo Alexa no PC Windows. */
import { checkAlexaCapabilities } from "./lib/jarvis-pc.mjs";
import { isAlexaMode } from "./lib/jarvis-alexa.mjs";

const cap = checkAlexaCapabilities();
console.log("Modo Alexa (env):", isAlexaMode() ? "LIGADO" : "desligado");
console.log("Plataforma:", cap.platform || process.platform);
console.log("\nPronto:");
for (const r of cap.ready || []) console.log("  ✓", r);
if (cap.missing?.length) {
  console.log("\nFalta instalar/abrir:");
  for (const m of cap.missing) console.log("  ✗", m);
}
console.log("\n", cap.hint || "");
process.exit(cap.ok ? 0 : 1);
