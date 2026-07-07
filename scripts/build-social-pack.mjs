/**
 * Full social pack: ads config + feed images + videos + legendas + Desktop copy.
 * Usage: node scripts/build-social-pack.mjs [product-limit]
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const limit = process.argv[2] ?? "";

function run(script, args = []) {
  const r = spawnSync(process.execPath, [resolve(root, "scripts", script), ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("\n=== Trove Social Pack ===\n");
console.log("1/4 Generating ad config from catalog…");
run("generate-social-ads-config.mjs");

console.log("\n2/4 Exporting feed images (IG + Facebook)…");
run("export-social-feed-images.mjs", limit ? [limit] : []);

console.log("\n3/4 Recording vertical videos (Reels + TikTok + FB)…");
run("record-social-videos.mjs", limit ? [limit] : []);

console.log("\n4/5 Writing legendas + content playbook…");
run("export-content-playbook.mjs");

const ads = JSON.parse(
  readFileSync(resolve(root, "marketing/social/ads.json"), "utf8"),
);
const md = buildMarkdown(ads);
const mdPath = resolve(root, "marketing/social/LEGENDAS-IG-FB-TIKTOK.md");
writeFileSync(mdPath, md, "utf8");

console.log("\n5/5 Copying to Desktop…");
const desktop = resolve(
  process.env.USERPROFILE ?? process.env.HOME ?? "",
  "OneDrive/Desktop/Trove-Redes-Sociais",
);
mkdirSync(desktop, { recursive: true });

const feedDest = resolve(desktop, "produtos-feed");
const videoDest = resolve(desktop, "produtos-videos");
mkdirSync(feedDest, { recursive: true });
mkdirSync(videoDest, { recursive: true });

cpSync(resolve(root, "marketing/social/output/feed"), feedDest, { recursive: true });
cpSync(resolve(root, "marketing/social/output/videos"), videoDest, { recursive: true });
cpSync(mdPath, resolve(desktop, "LEGENDAS-IG-FB-TIKTOK.md"));
cpSync(resolve(root, "marketing/social/CONTENT-PLAYBOOK.md"), resolve(desktop, "CONTENT-PLAYBOOK.md"));
writeFileSync(resolve(desktop, "COMO-POSTAR.md"), howToPost(), "utf8");

// Also refresh brand posts if script exists
if (existsSync(resolve(root, "scripts/export-trove-instagram-pack.mjs"))) {
  run("export-trove-instagram-pack.mjs");
  const igSrc = resolve(root, "public/instagram");
  if (existsSync(igSrc)) {
    cpSync(igSrc, resolve(desktop, "marca-instagram"), { recursive: true });
  }
}

console.log(`\n✓ Pack ready → ${desktop}\n`);

function howToPost() {
  return `# Trove — Como postar (Instagram · Facebook · TikTok)

## Pastas

| Pasta | Conteúdo | Onde usar |
|-------|----------|-----------|
| \`produtos-feed/\` | Imagens 1080×1080 | Instagram Post · Facebook Post |
| \`produtos-videos/\` | Vídeos verticais .webm | Instagram Reels · TikTok · Facebook Reels |
| \`marca-instagram/\` | Posts da marca Trove | Feed institucional |
| \`LEGENDAS-IG-FB-TIKTOK.md\` | Textos prontos por produto | Copiar e colar |
| \`CONTENT-PLAYBOOK.md\` | Kits, Stories, anúncios A/B/C, e-mail | Calendário editorial |

## Instagram
1. **Feed:** imagem de \`produtos-feed/\` + legenda Instagram do .md
2. **Reels:** vídeo de \`produtos-videos/\` + mesma legenda (curta)
3. Link na **bio:** https://trove-us.com

## Facebook (Página Trove)
1. **Post:** mesma imagem do feed
2. Cole legenda **Facebook** (tem link direto no texto)
3. **Reels:** mesmo vídeo vertical

## TikTok (@shoptrove.us)
1. Vídeo de \`produtos-videos/\`
2. Legenda **TikTok** do .md
3. Link na bio → trove-us.com

## Formato dos vídeos
Arquivos .webm — Instagram e TikTok aceitam na maioria dos celulares.
Se precisar .mp4: abra no CapCut → exportar → postar.

## Identidade
Sempre aparece como **Trove** / **@shoptrove.us** / **trove-us.com**
`;
}

function buildMarkdown(ads) {
  const lines = [
    "# Trove — Legendas por produto (Instagram · Facebook · TikTok)",
    "",
    "Imagens: `produtos-feed/` · Vídeos: `produtos-videos/`",
    "",
    "Bio Instagram/TikTok: **trove-us.com**",
    "",
    "---",
    "",
  ];

  for (const ad of ads) {
    lines.push(`## ${ad.product}`);
    lines.push(`**Arquivo:** \`${ad.file}\` · **Link:** ${ad.url}`, "");
    lines.push("### Instagram (feed + reels)", "```", ad.instagram, "```", "");
    lines.push("### Facebook", "```", ad.facebook, "```", "");
    lines.push("### TikTok", "```", ad.tiktok, "```", "");
    lines.push("---", "");
  }

  lines.push(
    "## Calendário sugerido (1 produto/dia)",
    "",
    ...ads.map(
      (ad, i) =>
        `- Dia ${i + 1}: **${ad.product}** — \`${ad.file}.png\` + \`${ad.file}.webm\``,
    ),
    "",
  );

  return lines.join("\n");
}
