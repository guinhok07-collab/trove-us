/**
 * Agenda pessoal do JARVIS — lembretes, pagamentos, despertadores com música.
 * O dono manda: "agenda pagamento X dia 10", "despertador 7h com música Y"
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { formatTelegram, sendTelegram } from "./telegram-notify.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const STORE_PATH = resolve(root, "marketing/social/jarvis-personal.json");
const DUE_PATH = resolve(root, "marketing/social/jarvis-personal-due.json");

function ownerName() {
  return process.env.META_OWNER_NAME?.trim() || "Igor";
}

function loadStore() {
  if (!existsSync(STORE_PATH)) {
    return { items: [], notified: {} };
  }
  try {
    const data = JSON.parse(readFileSync(STORE_PATH, "utf8"));
    return {
      items: Array.isArray(data.items) ? data.items : [],
      notified: data.notified && typeof data.notified === "object" ? data.notified : {},
    };
  } catch {
    return { items: [], notified: {} };
  }
}

function saveStore(store) {
  mkdirSync(dirname(STORE_PATH), { recursive: true });
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Parse horário solto: "7h", "7:30", "19:00", "7 da manhã" */
function parseTimeToday(text, base = new Date()) {
  const t = String(text).toLowerCase();
  let m = t.match(/\b(\d{1,2})[:h](\d{2})\b/);
  let hour;
  let min = 0;
  if (m) {
    hour = Number(m[1]);
    min = Number(m[2]);
  } else {
    m = t.match(/\b(\d{1,2})\s*h\b/);
    if (m) hour = Number(m[1]);
  }
  if (hour == null || hour > 23 || min > 59) return null;

  if (/noite|tarde/.test(t) && hour < 12) hour += 12;
  if (/manhã|manha/.test(t) && hour === 12) hour = 0;

  const d = new Date(base);
  d.setSeconds(0, 0);
  d.setHours(hour, min, 0, 0);
  if (d.getTime() <= Date.now() - 30_000) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** "dia 10", "amanhã", "hoje", "segunda" */
function parseDay(text, base = new Date()) {
  const t = String(text).toLowerCase();
  const d = new Date(base);
  d.setHours(9, 0, 0, 0);

  if (/\bhoje\b/.test(t)) return d;
  if (/\bamanh[ãa]\b/.test(t)) {
    d.setDate(d.getDate() + 1);
    return d;
  }

  const dayM = t.match(/\bdia\s+(\d{1,2})\b/);
  if (dayM) {
    const day = Number(dayM[1]);
    d.setDate(day);
    if (d.getTime() < Date.now() - 3600_000) {
      d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  const weekdays = [
    ["domingo", 0],
    ["segunda", 1],
    ["terça", 2],
    ["terca", 2],
    ["quarta", 3],
    ["quinta", 4],
    ["sexta", 5],
    ["s[aá]bado", 6],
  ];
  for (const [name, n] of weekdays) {
    if (new RegExp(name).test(t)) {
      const cur = d.getDay();
      let add = (n - cur + 7) % 7;
      if (add === 0) add = 7;
      d.setDate(d.getDate() + add);
      return d;
    }
  }

  return null;
}

function extractMusic(text) {
  const url = String(text).match(/https?:\/\/\S+/i);
  if (url) return url[0].replace(/[),.]+$/, "");
  // nome solto depois de "música" / "musica"
  const m = String(text).match(/m[uú]sica\s+(.+)$/i);
  if (m) return m[1].trim();
  return null;
}

function isPaymentItem(item) {
  const t = `${item.title || ""} ${item.kind || ""}`.toLowerCase();
  return (
    item.kind === "payment" ||
    /\bpagamento\b|\bpagar\b|\bboleto\b|\baluguel\b|\binternet\b|\bluz\b|\bconta\b|\bvencimento\b|\bfatura\b/.test(
      t,
    )
  );
}

/** STT erra "apagar" como "dar" — detecta intenção de gerir lembretes. */
function isPersonalManageIntent(q) {
  if (/dar todos/.test(q) && /(deix|só|so|apenas|pag)/.test(q)) return true;
  if (/(apag|delet|remov|cancel|limp|tira|esvazia)/.test(q) && /lembrete|agenda|lembran|só deixa|so deixa|apenas deixa/.test(q)) return true;
  if (/(lista|mostra|quais|ver)\s/.test(q) && /lembrete|agenda/.test(q)) return true;
  if (/o que tenho (agendado|na agenda|pra fazer)/.test(q)) return true;
  if (/marca.*(feito|pronto|ok)/.test(q) && /lembrete/.test(q)) return true;
  if (/apag(a|ar)?\s+(esse|este|isso|o último|ultimo)/.test(q)) return true;
  return false;
}

function isCreateReminderIntent(q, text) {
  if (isPersonalManageIntent(q)) return false;
  if (/\?|você lembra|voce lembra|posso |como |por que|entende|ajudar|frustra/.test(q)) return false;
  if (/(apag|delet|dar todos|limpar|lista|mostra|cancel)/.test(q)) return false;
  if (text.length > 100 && !/\bdia\s+\d{1,2}\b/.test(q) && !/\b\d{1,2}\s*h\b/.test(q)) return false;

  return (
    /\bagenda\b/.test(q) ||
    /\bme lembra\b/.test(q) ||
    /\blembrete de\b/.test(q) ||
    (/\bpagamento\b/.test(q) && (/\bdia\s+\d{1,2}\b/.test(q) || /\bamanh/.test(q) || /\bhoje\b/.test(q))) ||
    (/\bpagar\b/.test(q) && (/\bdia\s+\d{1,2}\b/.test(q) || /\bamanh/.test(q)))
  );
}

export function clearAllPersonalItems() {
  const store = loadStore();
  const active = store.items.filter((i) => !i.done);
  store.items = store.items.map((i) =>
    i.done ? i : { ...i, done: true, doneAt: new Date().toISOString(), status: "done" },
  );
  saveStore(store);
  writeDue([]);
  return active.length;
}

function looksLikeGarbageReminder(item) {
  const t = String(item.title || "").toLowerCase();
  if (t.length > 85) return true;
  if (/dar todos|apagar esse|anotei apagar|vou descansar|posso ajudar|frustra|entendo a frase/.test(t)) {
    return true;
  }
  if (/\?/.test(t) && !/\bdia\s+\d{1,2}\b/.test(t)) return true;
  return false;
}

export function clearPersonalExceptPayment() {
  const store = loadStore();
  let deleted = 0;
  let kept = 0;
  for (const item of store.items) {
    if (item.done) continue;
    if (isPaymentItem(item) && !looksLikeGarbageReminder(item)) {
      kept += 1;
      continue;
    }
    item.done = true;
    item.doneAt = new Date().toISOString();
    item.status = "done";
    deleted += 1;
  }
  saveStore(store);
  writeDue(loadDue().filter((d) => store.items.find((i) => i.id === d.id && !i.done)));
  return { deleted, kept };
}

export function deletePersonalByTitle(fragment) {
  const needle = String(fragment || "")
    .toLowerCase()
    .replace(/\b(lembrete|agenda|de|do|da|o|a)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!needle || needle.length < 2) return { ok: false, error: "Não entendi qual lembrete apagar." };

  const store = loadStore();
  const matches = store.items.filter(
    (i) => !i.done && i.title.toLowerCase().includes(needle),
  );
  if (!matches.length) {
    return { ok: false, error: `Nenhum lembrete ativo com "${fragment.trim()}".` };
  }
  for (const item of matches) {
    item.done = true;
    item.doneAt = new Date().toISOString();
    item.status = "done";
  }
  saveStore(store);
  writeDue(loadDue().filter((d) => !matches.some((m) => m.id === d.id)));
  return {
    ok: true,
    deleted: matches.length,
    titles: matches.map((m) => m.title),
  };
}

export function deleteLastPersonalItem() {
  const store = loadStore();
  const active = store.items.filter((i) => !i.done);
  if (!active.length) return { ok: false, error: "Nenhum lembrete ativo para apagar." };
  const item = active[active.length - 1];
  item.done = true;
  item.doneAt = new Date().toISOString();
  item.status = "done";
  saveStore(store);
  writeDue(loadDue().filter((d) => d.id !== item.id));
  return { ok: true, item };
}

/**
 * Apagar, listar, limpar lembretes — sem LLM.
 */
export function parsePersonalManageCommand(raw) {
  const text = String(raw || "").trim();
  const q = text.toLowerCase();

  if (!isPersonalManageIntent(q)) return { handled: false };

  if (/(lista|mostra|quais|ver)\s+(meus\s+)?(lembretes|agenda)|o que tenho (agendado|na agenda)/.test(q)) {
    const items = listPersonalItems();
    if (!items.length) {
      return { handled: true, ok: true, action: "list", message: "Nenhum lembrete ativo na sua agenda." };
    }
    const lines = items.map((i) => `· ${i.title} — ${i.when}`).join("\n");
    return {
      handled: true,
      ok: true,
      action: "list",
      message: `Você tem ${items.length} lembrete(s) ativo(s):\n${lines}`,
    };
  }

  if (
    (/(apag|delet|remov|limp|tira|dar todos|cancela)/.test(q) &&
      (/lembrete|agenda/.test(q) || /só deixa|so deixa|apenas deixa/.test(q)) &&
      /(só|so|apenas|deix|exceto|manter).*(pag|pagamento)/.test(q)) ||
    (/dar todos/.test(q) && /deix/.test(q) && /pag/.test(q))
  ) {
    const { deleted, kept } = clearPersonalExceptPayment();
    return {
      handled: true,
      ok: true,
      action: "clear_except_payment",
      message: `Pronto. Apaguei ${deleted} lembrete(s). Mantive ${kept} de pagamento.`,
    };
  }

  if (/(apag|delet|remov|limp|esvazia|cancela)\s+(todos|tudo)/.test(q) && /lembrete|agenda/.test(q)) {
    const n = clearAllPersonalItems();
    return {
      handled: true,
      ok: true,
      action: "clear_all",
      message: `Pronto. ${n} lembrete(s) apagado(s). Agenda limpa.`,
    };
  }

  if (/apag(a|ar)?\s+(esse|este|isso|o último|ultimo)/.test(q)) {
    const r = deleteLastPersonalItem();
    if (!r.ok) return { handled: true, ok: false, error: r.error };
    return {
      handled: true,
      ok: true,
      action: "delete_last",
      message: `Apaguei o último lembrete: "${r.item.title}".`,
    };
  }

  const delM = q.match(/(?:apag|delet|remov|cancela|tira)\s+(?:o\s+)?lembrete\s+(?:de\s+)?(.+)/);
  if (delM) {
    const r = deletePersonalByTitle(delM[1]);
    if (!r.ok) return { handled: true, ok: false, error: r.error };
    return {
      handled: true,
      ok: true,
      action: "delete_match",
      message: `Apaguei ${r.deleted} lembrete(s): ${r.titles.join("; ")}.`,
    };
  }

  if (/(apag|delet|remov|limp)\s+(.+)/.test(q) && /lembrete/.test(q)) {
    const frag = q.replace(/.*(apag|delet|remov|limp)\s+/, "").replace(/lembrete(s)?/g, "").trim();
    const r = deletePersonalByTitle(frag);
    if (!r.ok) return { handled: true, ok: false, error: r.error };
    return {
      handled: true,
      ok: true,
      action: "delete_match",
      message: `Apaguei ${r.deleted} lembrete(s): ${r.titles.join("; ")}.`,
    };
  }

  return {
    handled: true,
    ok: false,
    error: 'Tente: "lista lembretes", "apaga todos os lembretes", ou "apaga todos só deixa pagamento".',
  };
}

export function tryPersonalManageFromSpeech(question) {
  const parsed = parsePersonalManageCommand(question);
  if (!parsed.handled) return { ok: false, handled: false };
  if (!parsed.ok) return { ok: false, handled: true, error: parsed.error };
  return {
    ok: true,
    handled: true,
    managed: true,
    action: parsed.action,
    message: parsed.message,
  };
}

/**
 * Cria lembrete/agenda — só com intenção clara (evita gravar conversa inteira).
 */
export function parsePersonalCommand(raw) {
  const text = String(raw || "").trim();
  const q = text.toLowerCase();

  const isAlarm = /despertador|me acorda|me acordar|alarme|acordar/.test(q);
  if (isAlarm) {
    return {
      ok: false,
      error: "Despertador desativado. Diga: coloca música X, abre YouTube, ou abre Chrome.",
    };
  }

  if (!isCreateReminderIntent(q, text)) return { ok: false };

  const timePart = parseTimeToday(text);
  let when = parseDay(text);

  when = timePart || when;
  if (!when) {
    // default: amanhã 9h se falou pagamento sem data
    when = new Date();
    when.setDate(when.getDate() + 1);
    when.setHours(9, 0, 0, 0);
  } else if (timePart && parseDay(text)) {
    // tem dia + hora
    const day = parseDay(text);
    day.setHours(timePart.getHours(), timePart.getMinutes(), 0, 0);
    when = day;
  } else if (!timePart && parseDay(text)) {
    when.setHours(9, 0, 0, 0);
  }

  let title = text
    .replace(/^(jarvis[,!\s]*)/i, "")
    .replace(/\b(agenda|me lembra|me lembrar|lembrete|de|pra mim|para mim)\b/gi, " ")
    .replace(/\b(hoje|amanh[ãa]|dia\s+\d{1,2}|às?\s*\d{1,2}[:h]?\d{0,2}|da manhã|da tarde|da noite)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!title || title.length < 3) {
    title = /pag/.test(q) ? "Pagamento (seu)" : "Lembrete";
  }

  // Sempre "reminder" ou "payment" — NÃO misturar com fatura Meta Ads do sistema
  const kind = /pagamento|pagar|boleto|aluguel|internet|luz|conta/.test(q) ? "payment" : "reminder";
  return {
    ok: true,
    item: {
      id: uid("note"),
      kind,
      personal: true,
      title,
      whenAt: when.toISOString(),
      music: null,
      musicUrl: null,
      status: "scheduled",
      createdAt: new Date().toISOString(),
      done: false,
      note: "Lembrete SEU (data que você pediu) — não é pagamento Meta Ads",
    },
  };
}

export function addPersonalItem(item) {
  const store = loadStore();
  store.items.push(item);
  saveStore(store);
  return item;
}

export function listPersonalItems({ includeDone = false } = {}) {
  const store = loadStore();
  const now = Date.now();
  return store.items
    .filter((i) => includeDone || !i.done)
    .map((i) => {
      const t = new Date(i.whenAt).getTime();
      let status = i.status || "scheduled";
      if (i.done) status = "done";
      else if (t <= now) status = i.kind === "alarm" ? "ringing" : "due";
      else status = "scheduled";
      return {
        ...i,
        status,
        when: new Date(i.whenAt).toLocaleString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        priority: status === "ringing" || status === "due" ? 0 : 2,
      };
    })
    .sort((a, b) => new Date(a.whenAt) - new Date(b.whenAt));
}

export function markPersonalDone(id) {
  const store = loadStore();
  const item = store.items.find((i) => i.id === id);
  if (!item) return false;
  item.done = true;
  item.status = "done";
  item.doneAt = new Date().toISOString();
  saveStore(store);
  return true;
}

export function dismissDue(id) {
  const due = loadDue().filter((d) => d.id !== id);
  writeDue(due);
  markPersonalDone(id);
}

function loadDue() {
  if (!existsSync(DUE_PATH)) return [];
  try {
    return JSON.parse(readFileSync(DUE_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeDue(items) {
  mkdirSync(dirname(DUE_PATH), { recursive: true });
  writeFileSync(DUE_PATH, JSON.stringify(items, null, 2), "utf8");
}

/** Dispara lembretes/alarmes vencidos (Telegram + fila pro painel). */
export async function fireDuePersonalItems() {
  const store = loadStore();
  const now = Date.now();
  const fired = [];
  const dueQueue = loadDue();

  for (const item of store.items) {
    if (item.done) continue;
    if (item.kind === "alarm") continue;
    const t = new Date(item.whenAt).getTime();
    if (t > now) continue;

    const already = store.notified[item.id];
    if (already && now - already < 12 * 3600_000) continue;

    store.notified[item.id] = now;
    fired.push(item);

    const isAlarm = item.kind === "alarm";
    let wakeSpeech = null;
    // Música SÓ se o dono pediu no despertador (nunca música do dia em loop na conversa)
    const musicUrl =
      item.musicUrl ||
      (typeof item.music === "string" && item.music.startsWith("http") ? item.music : null);

    if (isAlarm) {
      try {
        const { buildWakeSpeech } = await import("./jarvis-memory.mjs");
        const { getSiteTrafficReport } = await import("./trove-traffic.mjs");
        const progress = await getSiteTrafficReport(7).catch(() => null);
        wakeSpeech = buildWakeSpeech({ progress, includeMusicLine: Boolean(musicUrl) });
      } catch {
        wakeSpeech = {
          speech: `${ownerName()}, Aria aqui. Hora de acordar. Vamos desenrolar a Trove.`,
          musicUrl: null,
          mood: "despertar",
        };
      }
    }

    const title = isAlarm ? `⏰ Despertador: ${item.title}` : `📌 Lembrete: ${item.title}`;
    await sendTelegram(
      formatTelegram("jarvis", [
        `${ownerName()}, Aria aqui.`,
        title,
        isAlarm ? wakeSpeech?.speech : null,
        musicUrl ? `Música (só neste alarme): ${musicUrl}` : null,
        isAlarm
          ? "Voz no painel. Música só se você pediu no despertador."
          : "Não esquece — eu tô de olho.",
      ].filter(Boolean)),
    );

    if (!dueQueue.some((d) => d.id === item.id)) {
      dueQueue.push({
        id: item.id,
        kind: item.kind,
        title: item.title,
        musicUrl: musicUrl || null,
        music: null,
        wakeSpeech: wakeSpeech?.speech || null,
        mood: wakeSpeech?.mood || null,
        whenAt: item.whenAt,
        firedAt: new Date().toISOString(),
      });
    }

    // lembretes (não alarme) marcam done após notificar uma vez
    if (!isAlarm) {
      item.done = true;
      item.doneAt = new Date().toISOString();
    }
  }

  saveStore(store);
  writeDue(dueQueue);
  return fired;
}

export function getDueForPanel() {
  return loadDue();
}

export function ackDue(id) {
  const due = loadDue().filter((d) => d.id !== id);
  writeDue(due);
  const store = loadStore();
  const item = store.items.find((i) => i.id === id);
  if (item?.kind === "alarm") {
    item.done = true;
    item.doneAt = new Date().toISOString();
    saveStore(store);
  }
  return true;
}

/** Agenda pessoal: gerir (apagar/listar) ou criar lembrete. */
export function tryPersonalFromSpeech(question) {
  const manage = tryPersonalManageFromSpeech(question);
  if (manage.handled) return manage;

  const schedule = tryScheduleFromSpeech(question);
  if (schedule.disabled) return schedule;
  if (schedule.ok) return { ...schedule, created: true };
  return schedule;
}

/** Tenta agendar a partir da fala do usuário. */
export function tryScheduleFromSpeech(question) {
  const parsed = parsePersonalCommand(question);
  if (!parsed.ok) {
    if (parsed.error && /despertador desativado/i.test(parsed.error)) {
      return { ok: false, disabled: true, error: parsed.error };
    }
    return parsed;
  }
  const item = addPersonalItem(parsed.item);
  return {
    ok: true,
    item,
    message: `Anotei: ${item.title} em ${new Date(item.whenAt).toLocaleString("pt-BR")}${
      item.musicUrl || item.music ? ` · música ${item.musicUrl || item.music}` : ""
    }. Eu te lembro.`,
  };
}
