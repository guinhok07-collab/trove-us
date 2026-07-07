/**
 * JARVIS nível 2 — autonomia no negócio.
 * Executa sozinha o que é seguro; só pede ok para gastar dinheiro / criar ads.
 */
import { appendLog } from "./ads-log.mjs";
import { formatTelegram, sendTelegram } from "./telegram-notify.mjs";
import { getCautiousMode } from "./ads-cautious-mode.mjs";
import {
  isMetaAdsConfigured,
  verifyMetaToken,
} from "./meta-ads-api.mjs";

function ownerName() {
  return process.env.META_OWNER_NAME?.trim() || "Igor";
}

/**
 * Ciclo autônomo (seguro):
 * - dispara lembretes/alarmes pessoais
 * - se Meta ok: monitora, pausa ruins, corrige placements (sem criar ad / sem boost)
 */
export async function runAutonomousCycle({ log = () => {}, notify = true } = {}) {
  const did = [];
  const skipped = [];
  const name = ownerName();

  // 1) Vida / agenda pessoal — sempre
  try {
    const { fireDuePersonalItems, listPersonalItems } = await import("./jarvis-personal.mjs");
    const fired = await fireDuePersonalItems();
    if (fired.length) {
      did.push(
        `Lembretes/alarmes: ${fired.map((f) => f.title).join(", ")}`,
      );
    }
    const duePersonal = listPersonalItems().filter(
      (i) => i.status === "due" || i.status === "ringing",
    );
    if (duePersonal.length && !fired.length) {
      skipped.push(`${duePersonal.length} pessoal(is) já notificado(s)`);
    }
  } catch (err) {
    skipped.push(`Agenda pessoal: ${err.message}`);
  }

  // 2) Negócio Meta — só o que não gasta mais
  if (!isMetaAdsConfigured()) {
    skipped.push("Meta não configurada");
    return summarize(did, skipped, notify, name, log);
  }

  const token = await verifyMetaToken().catch((e) => ({ ok: false, error: e.message }));
  if (!token.ok || token.expired) {
    skipped.push(token.error || "Token Meta inválido — autonomia de ads pausada");
    return summarize(did, skipped, notify, name, log);
  }

  const cautious = await getCautiousMode({ force: true });

  try {
    const { runJarvisCycle } = await import("./ads-jarvis.mjs");
    // forceLlm false no auto pra não gastar GPT em todo minuto; watch já analisa
    const cycle = await runJarvisCycle({
      dryRun: false,
      skipTelegram: true,
      forceLlm: false,
    });

    if (cycle.ok) {
      if (cycle.fixes?.length) {
        did.push(
          `Correções: ${cycle.fixes.map((f) => f.detail).join("; ")}`,
        );
      }
      const paused = cycle.watch?.review?.paused?.length ?? 0;
      if (paused) did.push(`Pausei ${paused} anúncio(s) fraco(s)`);

      const boosted = cycle.watch?.review?.boosted?.length ?? 0;
      if (boosted && cautious.policy?.boost) {
        did.push(`Impulsionei ${boosted} (política permitiu)`);
      } else if (boosted && !cautious.policy?.boost) {
        skipped.push("Boost bloqueado (modo cauteloso / pagamento)");
      }

      const created = cycle.watch?.created ?? 0;
      if (created && cautious.policy?.createAds) {
        did.push(`Criei ${created} anúncio(s)`);
      } else if (!cautious.policy?.createAds) {
        skipped.push("Criar ads só com sua ordem FAÇA (ou Meta liberada sem cautela)");
      }
    } else {
      skipped.push(cycle.error || "Ciclo ads falhou");
    }
  } catch (err) {
    skipped.push(`Ads: ${err.message}`);
  }

  // 3) Reel orgânico se já passou da hora e ainda não postou
  try {
    const { shouldRunSocialOrganicNow, tickSocialOrganicScheduler } = await import(
      "./social-organic-scheduler.mjs"
    );
    const check = shouldRunSocialOrganicNow();
    if (check.run) {
      const social = await tickSocialOrganicScheduler({ source: "jarvis-autonomy" });
      if (social?.ok && !social.skipped && !social.dryRun) {
        did.push(`Reel publicado: ${social.ad?.product || social.ad?.slug || "ok"}`);
      } else if (social?.error) {
        skipped.push(`Reel: ${social.error}`);
      }
    }
  } catch (err) {
    skipped.push(`Reel: ${err.message}`);
  }

  appendLog({
    action: "jarvis_autonomy",
    did: did.length,
    skipped: skipped.length,
  });

  return summarize(did, skipped, notify, name, log);
}

async function summarize(did, skipped, notify, name, log) {
  const result = {
    ok: true,
    did,
    skipped,
    at: new Date().toISOString(),
  };

  if (did.length) {
    log(`JARVIS autonomia: ${did.join(" · ")}`);
    if (notify) {
      await sendTelegram(
        formatTelegram("jarvis", [
          `${name}, agi sozinha (nível 2).`,
          did.map((d) => `✓ ${d}`).join("\n"),
          skipped.length ? `Pendente/bloqueado:\n${skipped.map((s) => `• ${s}`).join("\n")}` : null,
        ].filter(Boolean)),
      ).catch(() => {});
    }
  } else {
    log(`JARVIS autonomia: nada novo (${skipped.slice(0, 2).join("; ") || "ok"})`);
  }

  return result;
}
