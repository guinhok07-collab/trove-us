/**
 * Memória pessoal da Aria — quem é o dono, manias, rotina, preferências, músicas do dia.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PATH = resolve(root, "marketing/social/aria-memory.json");

/** Músicas instrumentais por dia (links diretos mp3 — podem ser trocados pelo dono). */
const DEFAULT_MUSIC_BY_DAY = {
  0: { mood: "domingo calmo", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
  1: { mood: "segunda foco", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
  2: { mood: "terça energia", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
  3: { mood: "quarta meio de semana", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
  4: { mood: "quinta impulso", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  5: { mood: "sexta leve", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
  6: { mood: "sábado livre", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3" },
};

function defaultMemory() {
  return {
    profile: {
      name: process.env.META_OWNER_NAME?.trim() || "Igor",
      howToCall: null,
      speechStyle: null,
      habits: [],
      likes: [],
      dislikes: [],
      routines: {
        gym: null,
        gymNotes: null,
        workNotes: "Trove / ads / loja US",
      },
      goals: ["Conseguir a primeira venda na Trove", "Escalar vendas nos EUA"],
      notes: [],
    },
    musicByDay: { ...DEFAULT_MUSIC_BY_DAY },
    facts: [],
    updatedAt: null,
  };
}

export function loadMemory() {
  if (!existsSync(PATH)) return defaultMemory();
  try {
    const data = JSON.parse(readFileSync(PATH, "utf8"));
    const base = defaultMemory();
    return {
      ...base,
      ...data,
      profile: { ...base.profile, ...(data.profile || {}) },
      routines: { ...base.profile.routines, ...(data.profile?.routines || {}) },
      musicByDay: { ...base.musicByDay, ...(data.musicByDay || {}) },
      facts: Array.isArray(data.facts) ? data.facts : [],
    };
  } catch {
    return defaultMemory();
  }
}

function saveMemory(mem) {
  mkdirSync(dirname(PATH), { recursive: true });
  mem.updatedAt = new Date().toISOString();
  writeFileSync(PATH, JSON.stringify(mem, null, 2), "utf8");
}

function pushUnique(arr, value) {
  const v = String(value || "").trim();
  if (!v) return arr;
  const low = v.toLowerCase();
  if (arr.some((x) => String(x).toLowerCase() === low)) return arr;
  return [...arr, v];
}

function addFact(mem, key, value) {
  mem.facts = mem.facts.filter((f) => f.key !== key);
  mem.facts.push({ key, value, at: new Date().toISOString() });
  if (mem.facts.length > 80) mem.facts = mem.facts.slice(-80);
}

/**
 * Aprende com a fala do usuário (manias, academia, preferências).
 */
export function learnFromSpeech(raw) {
  const text = String(raw || "").trim();
  const q = text.toLowerCase();
  const mem = loadMemory();
  const learned = [];

  // "me chama de X" / "pode me chamar de"
  let m = text.match(/me chama(?:r)? de\s+(.+)$/i) || text.match(/pode me chamar de\s+(.+)$/i);
  if (m) {
    mem.profile.howToCall = m[1].replace(/[.!].*$/, "").trim();
    addFact(mem, "howToCall", mem.profile.howToCall);
    learned.push(`vou te chamar de ${mem.profile.howToCall}`);
  }

  // academia — só se o dono mencionar; não sugerir
  if (/fa[cç]o academia|treino|malho|malhar|academia/.test(q)) {
    const neg = /n[aã]o fa[cç]o academia|n[aã]o treino|parei a academia/.test(q);
    mem.profile.routines.gym = !neg;
    mem.profile.routines.gymNotes = text.slice(0, 200);
    addFact(mem, "gym", neg ? "não faz academia" : "faz academia");
    learned.push(neg ? "anotei que você não faz academia" : "anotei que você faz academia");
    if (!neg) mem.profile.habits = pushUnique(mem.profile.habits, "academia");
  }

  // mania / hábito
  m = text.match(/minha mania [eé]\s+(.+)$/i) || text.match(/tenho mania de\s+(.+)$/i);
  if (m) {
    const habit = m[1].replace(/[.!].*$/, "").trim();
    mem.profile.habits = pushUnique(mem.profile.habits, habit);
    addFact(mem, `habit:${habit.slice(0, 40)}`, habit);
    learned.push(`anotei sua mania: ${habit}`);
  }

  // gosto / não gosto
  m = text.match(/eu gosto de\s+(.+)$/i) || text.match(/gosto muito de\s+(.+)$/i);
  if (m) {
    const like = m[1].replace(/[.!].*$/, "").trim();
    mem.profile.likes = pushUnique(mem.profile.likes, like);
    addFact(mem, `like:${like.slice(0, 40)}`, like);
    learned.push(`anotei que você gosta de ${like}`);
  }
  m = text.match(/n[aã]o gosto de\s+(.+)$/i) || text.match(/odeio\s+(.+)$/i);
  if (m) {
    const dislike = m[1].replace(/[.!].*$/, "").trim();
    mem.profile.dislikes = pushUnique(mem.profile.dislikes, dislike);
    addFact(mem, `dislike:${dislike.slice(0, 40)}`, dislike);
    learned.push(`anotei que você não gosta de ${dislike}`);
  }

  // forma de falar
  m = text.match(/eu falo\s+(.+)$/i) || text.match(/minha forma de falar [eé]\s+(.+)$/i);
  if (m) {
    mem.profile.speechStyle = m[1].replace(/[.!].*$/, "").trim();
    addFact(mem, "speechStyle", mem.profile.speechStyle);
    learned.push("anotei sua forma de falar");
  }

  // lembra que...
  m = text.match(/(?:lembra|anota|guarda) que\s+(.+)$/i);
  if (m) {
    const note = m[1].replace(/[.!]+$/, "").trim();
    mem.profile.notes = pushUnique(mem.profile.notes, note).slice(-40);
    addFact(mem, `note:${Date.now()}`, note);
    learned.push(`guardei: ${note}`);
  }

  // meta / objetivo
  m = text.match(/(?:minha meta [eé]|quero\s+)(.+)$/i);
  if (m && /venda|meta|fatur|crescer|loja/.test(q)) {
    const goal = m[1].replace(/[.!]+$/, "").trim();
    mem.profile.goals = pushUnique(mem.profile.goals, goal).slice(-10);
    addFact(mem, `goal:${goal.slice(0, 40)}`, goal);
    learned.push(`meta anotada: ${goal}`);
  }

  // música do dia
  m = text.match(/m[uú]sica d[eo]\s+(segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo)\s+(https?:\/\/\S+)/i);
  if (m) {
    const map = {
      domingo: 0,
      segunda: 1,
      terca: 2,
      terça: 2,
      quarta: 3,
      quinta: 4,
      sexta: 5,
      sabado: 6,
      sábado: 6,
    };
    const day = map[m[1].toLowerCase()];
    if (day != null) {
      mem.musicByDay[day] = {
        mood: m[1],
        url: m[2].replace(/[),.]+$/, ""),
      };
      learned.push(`música de ${m[1]} atualizada`);
    }
  }

  if (learned.length) saveMemory(mem);
  return { learned, memory: mem };
}

export function musicForToday(date = new Date()) {
  const mem = loadMemory();
  const day = date.getDay();
  return mem.musicByDay[day] || DEFAULT_MUSIC_BY_DAY[day];
}

/** Frases de hora + progresso (usa tráfego se vier). Música só se includeMusicLine. */
export function buildWakeSpeech({ progress, includeMusicLine = false } = {}) {
  const mem = loadMemory();
  const name = mem.profile.howToCall || mem.profile.name || "Igor";
  const hour = new Date().getHours();
  const music = musicForToday();

  let timePhrase;
  if (hour < 6) timePhrase = `${name}, ainda é madrugada, mas eu tô aqui. Hora de levantar com calma.`;
  else if (hour < 9) timePhrase = `Bom dia, ${name}. Aria na área. O dia é nosso — vamos desenrolar a Trove.`;
  else if (hour < 12) timePhrase = `Bom dia, ${name}. Manhã andando. Foco no que gera venda.`;
  else if (hour < 14) timePhrase = `Boa tarde, ${name}. Meio-dia. Bora manter o ritmo.`;
  else if (hour < 18) timePhrase = `Boa tarde, ${name}. Tarde produtiva — um passo de cada vez.`;
  else if (hour < 21) timePhrase = `Boa noite chegando, ${name}. Ainda dá pra avançar o essencial.`;
  else timePhrase = `${name}, noite. Descansa a cabeça, mas a meta continua: vender.`;

  let progressPhrase = "";
  if (progress) {
    const t = progress.totals || {};
    const purchase = t.purchase ?? 0;
    if (purchase > 0) {
      progressPhrase = ` Progresso: já temos ${purchase} compra(s) no período. É isso — escala em cima do que funcionou.`;
    } else {
      progressPhrase = ` Progresso: ${t.pageView ?? 0} visitas, ${t.initiateCheckout ?? 0} checkout(s), ainda 0 vendas. Meta de hoje: a primeira venda.`;
    }
  }

  let personal = "";
  if (mem.profile.habits?.length) {
    personal = ` Lembro de você: ${mem.profile.habits.slice(0, 2).join(", ")}.`;
  }

  const musicLine = includeMusicLine ? ` Música: ${music.mood}.` : "";
  const speech = `${timePhrase}${progressPhrase}${personal}${musicLine}`;
  return {
    speech,
    musicUrl: includeMusicLine ? music.url : null,
    mood: music.mood,
    profileName: name,
  };
}

/** Resumo pra injetar no prompt da Aria */
export function memoryForPrompt() {
  const mem = loadMemory();
  const p = mem.profile;
  return {
    name: p.name,
    howToCall: p.howToCall,
    speechStyle: p.speechStyle,
    habits: p.habits,
    likes: p.likes,
    dislikes: p.dislikes,
    gym: p.routines?.gym,
    gymNotes: p.routines?.gymNotes,
    goals: p.goals,
    notes: (p.notes || []).slice(-10),
    facts: (mem.facts || []).slice(-20).map((f) => `${f.key}: ${f.value}`),
    musicToday: musicForToday(),
  };
}
