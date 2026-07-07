/**
 * Acompanha comandos em execução (optimize, watch, etc.) com linhas legíveis.
 */
const LABELS = {
  watch: "Verificação automática",
  optimize: "Otimização completa",
  autopilot: "Criando anúncios",
  review: "Revisão de anúncios",
  "meta-recs": "Sincronizando Meta",
  run: "Autopilot completo",
  jarvis: "JARVIS — análise completa",
};

const LINE_MAP = [
  [/Limpando campanhas|campanha\(s\) vazia/i, "Limpando campanhas vazias no Meta…"],
  [/Verificando criativos|Criativos OK|Gerando social pack/i, "Verificando imagens e vídeos…"],
  [/Publicando vídeos|Video ad|Reels/i, "Publicando vídeos Reels…"],
  [/Auto-Watch|Rodando auto-watch|JARVIS/i, "Analisando métricas dos anúncios…"],
  [/Correções automáticas|corrigi/i, "Corrigindo erros de anúncios…"],
  [/Análise:|Resumo:/i, (m) => m.input.replace(/^📊\s*/, "")],
  [/pausados?/i, "Pausando anúncios com desempenho ruim…"],
  [/impulsionados?|Boost|escalado/i, "Ajustando orçamento dos melhores…"],
  [/Fadiga|rotacion/i, "Detectando fadiga de criativo…"],
  [/Recomendações Meta|Opportunity Score/i, "Lendo recomendações do Meta…"],
  [/Criando anúncios|Ad created|Criados:/i, "Criando novos anúncios da fila…"],
  [/Orçamento semanal|teto semanal/i, "Verificando orçamento semanal…"],
  [/Done\.|Concluído/i, "Finalizando…"],
  [/User request limit|Application request limit|Limite de consultas/i, "Meta limitou consultas — aguardando…"],
];

let currentJob = null;
let lastFinished = null;

function friendlyLine(raw) {
  const line = String(raw ?? "").trim();
  if (!line || line.length < 4) return null;
  if (/^=+$|^[-—]+$/.test(line)) return null;
  if (/^Usage:|node --env-file/i.test(line)) return null;

  for (const [re, out] of LINE_MAP) {
    if (re.test(line)) {
      return typeof out === "function" ? out({ input: line }) : out;
    }
  }

  if (/^[✅⏸🚀📊📋➕🔄🛡️⚠️🧹🎬]/.test(line)) {
    return line.slice(0, 120);
  }
  return null;
}

export function startJob(script) {
  currentJob = {
    script,
    label: LABELS[script] ?? script,
    startedAt: new Date().toISOString(),
    lines: [{ at: new Date().toISOString(), text: `Iniciando: ${LABELS[script] ?? script}…` }],
    status: "running",
    progress: 5,
  };
  lastFinished = null;
  return currentJob;
}

export function appendJobOutput(chunk) {
  if (!currentJob || currentJob.status !== "running") return;
  for (const raw of String(chunk).split(/\r?\n/)) {
    const friendly = friendlyLine(raw);
    if (!friendly) continue;
    const last = currentJob.lines[currentJob.lines.length - 1]?.text;
    if (last === friendly) continue;
    currentJob.lines.push({ at: new Date().toISOString(), text: friendly });
    if (currentJob.lines.length > 24) currentJob.lines.shift();
    currentJob.progress = Math.min(95, currentJob.progress + 8);
  }
}

export function finishJob(code) {
  if (!currentJob) return;
  currentJob.status = code === 0 ? "done" : "error";
  currentJob.finishedAt = new Date().toISOString();
  currentJob.progress = 100;
  currentJob.lines.push({
    at: currentJob.finishedAt,
    text: code === 0 ? "✅ Concluído — atualizando painel…" : "❌ Terminou com avisos — veja o histórico",
  });
  lastFinished = { ...currentJob };
  const ref = currentJob;
  setTimeout(() => {
    if (currentJob === ref) currentJob = null;
  }, 90_000);
}

export function getJobStatus() {
  if (currentJob) {
    return {
      running: currentJob.status === "running",
      script: currentJob.script,
      label: currentJob.label,
      startedAt: currentJob.startedAt,
      lines: currentJob.lines,
      progress: currentJob.progress,
      status: currentJob.status,
    };
  }
  if (lastFinished && Date.now() - new Date(lastFinished.finishedAt).getTime() < 60_000) {
    return {
      running: false,
      script: lastFinished.script,
      label: lastFinished.label,
      lines: lastFinished.lines,
      progress: 100,
      status: lastFinished.status,
      finishedAt: lastFinished.finishedAt,
    };
  }
  return { running: false };
}

export function isJobRunning() {
  return currentJob?.status === "running";
}
