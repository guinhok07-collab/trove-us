/**
 * Sync productVideo from CJ into src/data/products.ts (video field only).
 * Usage: node --env-file=.env.local scripts/sync-cj-videos.mjs [--slug=xxx]
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  extractProductBlock,
  replaceProductBlock,
  extractVideo,
  getToken,
  queryBySku,
  queryPid,
} from "./lib/cj-catalog-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const key = process.env.CJ_API_KEY;
if (!key) throw new Error("Set CJ_API_KEY in .env.local");

const slugFilter = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1];

/** Optional pid map from prior CJ sync runs */
let pidMap = {};
try {
  const syncJson = resolve(__dirname, "cj-catalog-sync.json");
  pidMap = JSON.parse(readFileSync(syncJson, "utf8"));
} catch {
  /* optional */
}

function patchVideo(block, video) {
  if (video) {
    if (/video: /.test(block)) {
      return block.replace(/video: "[^"]+"/, `video: ${JSON.stringify(video)}`);
    }
    return block.replace(
      /(images: \[[\s\S]*?\],)\r?\n/,
      `$1\r\n    video: ${JSON.stringify(video)},\r\n`,
    );
  }
  return block.replace(/\r?\n    video: "[^"]+",/, "");
}

async function fetchVideo(token, { cjSku, supplierSku, slug }) {
  if (cjSku) {
    const hit = await queryBySku(token, cjSku);
    if (hit?.data) return extractVideo(hit.data);
  }

  const pidCandidates = [
    pidMap[slug]?.pid,
    pidMap[slug]?.supplierSku,
    supplierSku,
  ].filter(Boolean);

  for (const pid of pidCandidates) {
    const data = await queryPid(token, pid);
    if (data) {
      const video = extractVideo(data);
      if (video) return video;
    }
  }

  return undefined;
}

const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");
const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
const targets = slugFilter ? [slugFilter] : slugs;

console.log(`Syncing CJ videos for ${targets.length} product(s) (~1.1s each)…`);
console.log("Authenticating CJ…");
const token = await getToken(key);

let added = 0;
let cleared = 0;
let skipped = 0;
let failed = 0;

for (let i = 0; i < slugs.length; i++) {
  const slug = slugs[i];
  if (slugFilter && slug !== slugFilter) continue;

  const n = targets.indexOf(slug) + 1;
  if (n > 0) process.stdout.write(`[${n}/${targets.length}] ${slug}… `);

  const hit = extractProductBlock(source, slug);
  if (!hit) continue;

  const cjSku = hit.block.match(/cjSku: "([^"]+)"/)?.[1];
  const supplierSku = hit.block.match(/supplierSku: "([^"]+)"/)?.[1];
  if (!cjSku && !supplierSku) {
    skipped++;
    console.log("skip (no sku)");
    continue;
  }

  let video;
  try {
    video = await fetchVideo(token, { cjSku, supplierSku, slug });
  } catch (err) {
    console.log("ERR", err.message);
    failed++;
    continue;
  }

  if (!video && !/video: "http/.test(hit.block)) {
    skipped++;
    console.log("no video on CJ");
    continue;
  }

  const patched = patchVideo(hit.block, video);
  if (patched === hit.block) {
    skipped++;
    console.log("unchanged");
    continue;
  }

  source = replaceProductBlock(source, slug, patched);
  if (video) {
    added++;
    console.log("VIDEO ✓");
  } else {
    cleared++;
    console.log("cleared");
  }
}

writeFileSync(productsPath, source);
console.log(
  `\nDone: ${added} with video, ${cleared} cleared, ${skipped} unchanged, ${failed} errors`,
);
