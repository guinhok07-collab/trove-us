/**
 * Controle do PC Windows — Aria / Modo Alexa (música, YouTube, apps, volume, brilho).
 */
import { spawnSync } from "child_process";
import { stripWakeWord } from "./assistant-identity.mjs";
import { musicForToday } from "./jarvis-memory.mjs";

function ps(command) {
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { encoding: "utf8", windowsHide: true, timeout: 25000 },
  );
  if (r.status !== 0) {
    const err = (r.stderr || r.stdout || "falhou").trim();
    throw new Error(err.slice(0, 400));
  }
  return (r.stdout || "").trim();
}

function psSoft(command) {
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    { encoding: "utf8", windowsHide: true, timeout: 15000 },
  );
  return {
    ok: r.status === 0,
    out: (r.stdout || r.stderr || "").trim(),
  };
}

function encodeQuery(q) {
  return encodeURIComponent(String(q || "").trim());
}

function openUrl(url) {
  const safe = url.replace(/'/g, "''");
  ps(`Start-Process '${safe}'`);
}

function setBrightness(percent) {
  const p = Math.max(5, Math.min(100, Math.round(Number(percent))));
  ps(`
$b = ${p}
$methods = @(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop)
if (-not $methods.Count) { throw "Monitor interno sem controle WMI de brilho." }
foreach ($m in $methods) {
  Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{ Timeout = 1; Brightness = $b } | Out-Null
}
$cur = (Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue).CurrentBrightness
if ($null -ne $cur) { "brilho $cur" } else { "brilho $b" }
`);
  return `Brilho ajustado para ${p}%.`;
}

export function diagnoseDisplay() {
  try {
    const out = ps(`
$bright = Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue
$methods = @(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction SilentlyContinue)
$gpus = Get-CimInstance Win32_VideoController | ForEach-Object { "$($_.Name) | driver $($_.DriverVersion) | $($_.Status)" }
[pscustomobject]@{
  brightnessOk = [bool]$methods.Count
  currentBrightness = $bright.CurrentBrightness
  gpus = ($gpus -join ' || ')
} | ConvertTo-Json -Compress
`);
    return JSON.parse(out);
  } catch (err) {
    return { brightnessOk: false, error: err.message };
  }
}

/** Verifica Chrome, Edge, YouTube, Spotify, Cursor, etc. */
export function checkAlexaCapabilities() {
  const script = `
$checks = @()
function Test-App($name, $paths) {
  $cmd = Get-Command $name -ErrorAction SilentlyContinue
  if ($cmd) { return $true }
  foreach ($p in $paths) { if (Test-Path $p) { return $true } }
  return $false
}
$checks += [pscustomobject]@{ id='chrome'; ok=(Test-App 'chrome' @('${"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe".replace(/\\/g, "\\\\")}','${"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe".replace(/\\/g, "\\\\")}')); label='Google Chrome' }
$checks += [pscustomobject]@{ id='edge'; ok=(Test-App 'msedge' @()); label='Microsoft Edge' }
$checks += [pscustomobject]@{ id='cursor'; ok=(Test-App 'cursor' @('$env:LOCALAPPDATA\\Programs\\cursor\\Cursor.exe')); label='Cursor IDE' }
$checks += [pscustomobject]@{ id='spotify'; ok=(Test-App 'spotify' @('$env:APPDATA\\Spotify\\Spotify.exe')); label='Spotify' }
$checks += [pscustomobject]@{ id='youtube'; ok=$true; label='YouTube (web)' }
try {
  $r = Invoke-WebRequest -Uri 'https://www.youtube.com' -Method Head -TimeoutSec 8 -UseBasicParsing
  $checks = $checks | ForEach-Object { if ($_.id -eq 'youtube') { [pscustomobject]@{ id=$_.id; ok=($r.StatusCode -lt 500); label=$_.label } } else { $_ } }
} catch {
  $checks = $checks | ForEach-Object { if ($_.id -eq 'youtube') { [pscustomobject]@{ id=$_.id; ok=$false; label=$_.label } } else { $_ } }
}
$checks | ConvertTo-Json -Compress
`;
  try {
    const out = ps(script);
    const items = JSON.parse(out);
    const list = Array.isArray(items) ? items : [items];
    const ready = list.filter((i) => i.ok).map((i) => i.label);
    const missing = list.filter((i) => !i.ok).map((i) => i.label);
    return {
      ok: ready.length > 0,
      platform: process.platform,
      ready,
      missing,
      items: list,
      hint:
        missing.length > 0
          ? `Instale ou abra uma vez: ${missing.join(", ")}. Chrome ou Edge bastam para YouTube e música.`
          : "Tudo pronto para modo Alexa.",
    };
  } catch (err) {
    return { ok: false, error: err.message, ready: [], missing: [], items: [] };
  }
}

function setVolume(percent) {
  const p = Math.max(0, Math.min(100, Math.round(Number(percent))));
  ps(`
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Vol {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  public static void Down() { keybd_event(0xAE, 0, 0, UIntPtr.Zero); keybd_event(0xAE, 0, 2, UIntPtr.Zero); }
  public static void Up() { keybd_event(0xAF, 0, 0, UIntPtr.Zero); keybd_event(0xAF, 0, 2, UIntPtr.Zero); }
}
"@
1..50 | ForEach-Object { [Vol]::Down() }
$ups = [math]::Round(${p} / 2)
1..$ups | ForEach-Object { [Vol]::Up() }
"volume ~${p}"
`);
  return `Volume ajustado para cerca de ${p}%.`;
}

function volumeStep(dir) {
  const n = 5;
  const fn = dir === "up" ? "Up" : "Down";
  ps(`
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class Vol2 {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  public static void Down() { keybd_event(0xAE, 0, 0, UIntPtr.Zero); keybd_event(0xAE, 0, 2, UIntPtr.Zero); }
  public static void Up() { keybd_event(0xAF, 0, 0, UIntPtr.Zero); keybd_event(0xAF, 0, 2, UIntPtr.Zero); }
}
"@
1..${n} | ForEach-Object { [Vol2]::${fn}() }
`);
  return dir === "up" ? "Volume aumentado." : "Volume diminuído.";
}

function mediaKey(action) {
  const map = { play: "0xB3", pause: "0xB3", stop: "0xB2", next: "0xB0", prev: "0xB1" };
  const vk = map[action] || "0xB3";
  ps(`
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class MediaK {
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
  public static void Press(byte vk) { keybd_event(vk, 0, 0, UIntPtr.Zero); keybd_event(vk, 0, 2, UIntPtr.Zero); }
}
"@
[MediaK]::Press(${vk})
`);
  const labels = {
    play: "Reproduzindo.",
    pause: "Pausado.",
    stop: "Parado.",
    next: "Próxima faixa.",
    prev: "Faixa anterior.",
  };
  return labels[action] || "Ok.";
}

function openYoutubeSearch(query) {
  const q = encodeQuery(query);
  const searchUrl = `https://www.youtube.com/results?search_query=${q}`;
  openUrl(searchUrl);
  return `Abrindo YouTube com "${query.trim()}".`;
}

function openYoutubeMusic(query) {
  const url = query
    ? `https://music.youtube.com/search?q=${encodeQuery(query)}`
    : "https://music.youtube.com";
  openUrl(url);
  return query
    ? `YouTube Music — busca "${query.trim()}".`
    : "YouTube Music aberto.";
}

function openSpotifySearch(query) {
  const q = encodeQuery(query);
  const uri = `spotify:search:${query.trim()}`;
  const r = psSoft(`
try {
  Start-Process '${uri.replace(/'/g, "''")}'
  'spotify-uri'
} catch {
  Start-Process 'https://open.spotify.com/search/${q}'
  'spotify-web'
}
`);
  if (r.out.includes("spotify-uri")) {
    return `Spotify — buscando "${query.trim()}".`;
  }
  return `Spotify no navegador — "${query.trim()}".`;
}

function openTarget(target) {
  const t = String(target || "").trim();
  if (!t) throw new Error("Não entendi o que abrir.");
  if (/^https?:\/\//i.test(t)) {
    openUrl(t);
    return `Abri ${t}`;
  }

  const key = t.toLowerCase().replace(/^o\s+|^a\s+/, "");
  const map = {
    chrome: "chrome",
    navegador: "chrome",
    browser: "chrome",
    edge: "msedge",
    youtube: "https://www.youtube.com",
    "youtube music": "https://music.youtube.com",
    spotify: "spotify:",
    notepad: "notepad",
    bloco: "notepad",
    calculadora: "calc",
    calc: "calc",
    explorer: "explorer",
    arquivos: "explorer",
    terminal: "wt",
    powershell: "powershell",
    cursor: "cursor",
    vscode: "code",
    "visual studio code": "code",
    whatsapp: "whatsapp:",
    instagram: "https://www.instagram.com",
    facebook: "https://www.facebook.com",
    gmail: "https://mail.google.com",
    google: "https://www.google.com",
    trove: "https://trove-us.com",
    loja: "https://trove-us.com",
    admin: "https://trove-us.com/admin",
    netflix: "https://www.netflix.com",
    tiktok: "https://www.tiktok.com",
  };

  if (map[key]) {
    const app = map[key];
    if (app.startsWith("http") || app.endsWith(":")) {
      openUrl(app.startsWith("http") ? app : "https://open.spotify.com");
      return `Abri ${key}.`;
    }
    ps(`Start-Process '${app.replace(/'/g, "''")}'`);
    return `Abri ${key}.`;
  }

  ps(`Start-Process '${key.replace(/'/g, "''")}'`);
  return `Tentei abrir ${key}.`;
}

function lockPc() {
  ps("rundll32.exe user32.dll,LockWorkStation");
  return "PC bloqueado.";
}

function cleanMusicQuery(query) {
  return String(query || "")
    .replace(/\s+no\s+youtube\s*$/i, "")
    .replace(/\s+no\s+spotify\s*$/i, "")
    .replace(/\s+pra\s+tocar\s*$/i, "")
    .trim();
}

function playMusicQuery(query, raw) {
  const q = cleanMusicQuery(query);
  if (!q) {
    return { ok: false, handled: true, error: "Qual música?" };
  }

  if (/spotify/i.test(raw)) {
    return { ok: true, handled: true, message: openSpotifySearch(q) };
  }

  if (/youtube music|yt music/i.test(raw)) {
    return { ok: true, handled: true, message: openYoutubeMusic(q) };
  }

  // Padrão: YouTube (abre no navegador na hora)
  const msg = openYoutubeSearch(q);
  return { ok: true, handled: true, message: `Tocando "${q}" no YouTube. ${msg}` };
}

/**
 * Interpreta e executa comando de PC / Alexa.
 * @returns {{ ok: boolean, handled: boolean, message?: string, error?: string, clientPlayUrl?: string }}
 */
export function tryPcCommand(raw) {
  const stripped = stripWakeWord(raw);
  const q = String(stripped || raw || "").toLowerCase();

  if (/capacidades|diagn[oó]stico pc|o que (você|voce) consegue|modo alexa/i.test(q)) {
    const cap = checkAlexaCapabilities();
    const msg = cap.ok
      ? `Modo Alexa pronto. ${cap.hint} Disponível: ${cap.ready.join(", ")}.`
      : `Problema no PC: ${cap.error || "sem apps"}. ${cap.hint || ""}`;
    return { ok: cap.ok, handled: true, message: msg };
  }

  if (/m[uú]sica do dia|playlist do dia/.test(q)) {
    const m = musicForToday();
    if (m?.url) {
      return {
        ok: true,
        handled: true,
        message: `Tocando ${m.mood || "música do dia"}.`,
        clientPlayUrl: m.url,
      };
    }
    return {
      ok: true,
      handled: true,
      message: openYoutubeMusic("lofi hip hop"),
    };
  }

  // música / toca / play — estilo Alexa
  let m =
    q.match(/(?:coloca|p[oõ]e|toca|reproduz|play|bota)\s+(?:a\s+)?m[uú]sica\s+(.+)/i) ||
    q.match(/(?:quero ouvir|coloca|p[oõ]e|toca|play|bota)\s+(.+?)(?:\s+no\s+youtube|\s+pra\s+tocar)?$/i);
  if (m && !/volume|brilho|youtube aberto|an[uú]ncio|meta|venda/i.test(m[1])) {
    const res = playMusicQuery(m[1], q);
    if (res.handled) return res;
  }

  // YouTube — padrões Alexa ("mostra X no youtube", "assiste X", "play X on youtube")
  m = q.match(/(?:mostra|assiste|watch|find)\s+(.+?)\s+(?:no|pra|on)\s+youtube/i);
  if (m) {
    try {
      const res = playMusicQuery(m[1], q);
      return { ok: true, handled: true, message: res.message || openYoutubeSearch(m[1]) };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  m = q.match(/(?:pesquisa|busca|procura|search)\s+(.+?)\s+no\s+youtube/i);
  if (m) {
    try {
      return { ok: true, handled: true, message: openYoutubeSearch(m[1]) };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  m = q.match(/youtube\s+(?:e\s+)?(?:pesquisa|busca|procura)?\s*(.+)/i);
  if (m && m[1]?.trim()) {
    try {
      return { ok: true, handled: true, message: openYoutubeSearch(m[1]) };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  if (/^abre?\s+(o\s+)?youtube\s*$/i.test(q) || q === "youtube") {
    try {
      return { ok: true, handled: true, message: openTarget("youtube") };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  if (/abre?\s+(o\s+)?youtube music/i.test(q)) {
    try {
      return { ok: true, handled: true, message: openYoutubeMusic() };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  // media keys
  if (/pausa|para a m[uú]sica|para o som|stop/i.test(q) && !/despertador/.test(q)) {
    try {
      return { ok: true, handled: true, message: mediaKey(/stop|para/.test(q) ? "pause" : "pause") };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }
  if (/continua|retoma|play/i.test(q) && /m[uú]sica|som|v[ií]deo/.test(q)) {
    try {
      return { ok: true, handled: true, message: mediaKey("play") };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }
  if (/pr[oó]xim(a|o)|pula/i.test(q)) {
    try {
      return { ok: true, handled: true, message: mediaKey("next") };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  // brilho / diagnóstico
  if (/driver|diagn[oó]stico|placa de v[ií]deo|gpu/.test(q) && /tela|brilho|v[ií]deo|notebook|monitor/.test(q)) {
    const d = diagnoseDisplay();
    if (d.brightnessOk) {
      return {
        ok: true,
        handled: true,
        message: `Tela ok. Brilho ${d.currentBrightness}%. GPUs: ${d.gpus}.`,
      };
    }
    return { ok: false, handled: true, error: d.error || "Brilho indisponível." };
  }

  m = q.match(/brilho\s*(?:para|em|de)?\s*(\d{1,3})\s*%?/);
  if (/brilho/.test(q)) {
    try {
      let pct = m ? Number(m[1]) : /baix|menor|diminu|reduz/.test(q) ? 30 : 70;
      if (/um pouco|pouco/.test(q) && /baix|diminu|reduz/.test(q)) pct = 40;
      if (/um pouco|pouco/.test(q) && /aument|mais|subir/.test(q)) pct = 60;
      return { ok: true, handled: true, message: setBrightness(pct) };
    } catch (err) {
      const d = diagnoseDisplay();
      return {
        ok: false,
        handled: true,
        error: `${err.message} GPUs: ${d.gpus || "?"}.`,
      };
    }
  }

  // volume
  if (/volume|som\b/.test(q)) {
    try {
      if (/muta|mudo|silen/.test(q)) {
        ps(`
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
public class M { [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, System.UIntPtr dwExtraInfo);
public static void Mute(){ keybd_event(0xAD,0,0,System.UIntPtr.Zero); keybd_event(0xAD,0,2,System.UIntPtr.Zero);} }
"@
[M]::Mute()
`);
        return { ok: true, handled: true, message: "Som mutado/desmutado." };
      }
      m = q.match(/volume\s*(?:para|em|de)?\s*(\d{1,3})\s*%?/);
      if (m) return { ok: true, handled: true, message: setVolume(Number(m[1])) };
      if (/baix|diminu|menos|reduz/.test(q)) {
        return { ok: true, handled: true, message: volumeStep("down") };
      }
      if (/aument|mais|subir|alto/.test(q)) {
        return { ok: true, handled: true, message: volumeStep("up") };
      }
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  // google
  m = q.match(/(?:pesquisa|busca|google)\s+(.+)/i);
  if (m && !/youtube/.test(q)) {
    try {
      openUrl(`https://www.google.com/search?q=${encodeQuery(m[1])}`);
      return { ok: true, handled: true, message: `Pesquisando "${m[1].trim()}" no Google.` };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  // abrir app / site
  m =
    q.match(/abr[ae]\s+(?:o\s+|a\s+|no\s+)?(.+)$/i) ||
    String(stripped || raw).match(/abr[ae]\s+(https?:\/\/\S+)/i);
  if (m || /abre\s+/.test(q)) {
    try {
      let target = (m?.[1] || q.replace(/.*abre\s+/, "")).trim();
      target = target.replace(/\s+no\s+youtube\s*$/i, "").trim();
      return { ok: true, handled: true, message: openTarget(target) };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  if (/tranca|bloqueia|lock/.test(q) && /pc|tela|computador|notebook|windows/.test(q)) {
    try {
      return { ok: true, handled: true, message: lockPc() };
    } catch (err) {
      return { ok: false, handled: true, error: err.message };
    }
  }

  return { ok: false, handled: false };
}
