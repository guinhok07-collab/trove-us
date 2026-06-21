/**
 * Pick clearest hero image per product (max pixels, prefer JPG over tiny PNG).
 * Updates src/data/products.ts for any product where hero is not the best image.
 */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../src/data/products.ts");
const source = readFileSync(productsPath, "utf8");

function parseJpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) break;
    const marker = buf[i + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function parsePngSize(buf) {
  if (buf.toString("ascii", 1, 4) !== "PNG") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

async function dims(url) {
  try {
    const r = await fetch(url, { headers: { Range: "bytes=0-65535" } });
    const buf = Buffer.from(await r.arrayBuffer());
    const d = parseJpegSize(buf) || parsePngSize(buf);
    if (!d) return { url, w: 0, h: 0, area: 0 };
    const area = d.w * d.h;
    const isTinyPng = url.toLowerCase().endsWith(".png") && area < 500_000;
    const isJpg = /\.jpe?g$/i.test(url);
    const score = area + (isJpg ? 50_000 : 0) - (isTinyPng ? 1_000_000 : 0);
    return { url, ...d, area, score };
  } catch {
    return { url, w: 0, h: 0, area: 0, score: -1 };
  }
}

function extractProducts(text) {
  const blocks = [...text.matchAll(/\{\s*\n\s*id: "([^"]+)"[\s\S]*?slug: "([^"]+)"[\s\S]*?image: "([^"]+)"[\s\S]*?images: \[([\s\S]*?)\]/g)];
  return blocks.map((m) => {
    const images = [...m[4].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    return { id: m[1], slug: m[2], image: m[3], images };
  });
}

function patchProduct(text, slug, newImage, newImages) {
  const slugIdx = text.indexOf(`slug: "${slug}"`);
  if (slugIdx < 0) return text;
  const blockStart = text.lastIndexOf("{", slugIdx);
  const blockEnd = text.indexOf("\n  }", slugIdx);
  let block = text.slice(blockStart, blockEnd);

  block = block.replace(/image: "[^"]+"/, `image: ${JSON.stringify(newImage)}`);
  const imgsJson = JSON.stringify(newImages, null, 4)
    .split("\n")
    .map((line, i) => (i === 0 ? line : "      " + line.trim()))
    .join("\n");
  block = block.replace(/images: \[[\s\S]*?\]/, `images: ${imgsJson}`);

  return text.slice(0, blockStart) + block + text.slice(blockEnd);
}

const products = extractProducts(source);
console.log(`Scanning ${products.length} products...\n`);

const updates = [];
const BATCH = 8;

for (let i = 0; i < products.length; i += BATCH) {
  const batch = products.slice(i, i + BATCH);
  await Promise.all(
    batch.map(async (p) => {
      const all = [...new Set([p.image, ...p.images])];
      const ranked = await Promise.all(all.map(dims));
      ranked.sort((a, b) => b.score - a.score);
      const best = ranked[0];
      if (!best || best.score <= 0) return;

      const hero = ranked.find((r) => r.url === p.image);
      const heroScore = hero?.score ?? 0;

      if (best.url !== p.image && best.score > heroScore + 10_000) {
        const reordered = [best.url, ...all.filter((u) => u !== best.url)];
        updates.push({
          slug: p.slug,
          from: `${hero?.w || "?"}x${hero?.h || "?"} ${p.image.slice(-45)}`,
          to: `${best.w}x${best.h} ${best.url.slice(-45)}`,
          image: best.url,
          images: reordered.slice(0, 8),
        });
      }
    }),
  );
  process.stdout.write(".");
}

console.log(`\n\n${updates.length} products need hero swap:\n`);
for (const u of updates) {
  console.log(`${u.slug}`);
  console.log(`  - ${u.from}`);
  console.log(`  + ${u.to}`);
}

if (!updates.length) {
  console.log("Nothing to update.");
  process.exit(0);
}

let patched = source;
for (const u of updates) {
  patched = patchProduct(patched, u.slug, u.image, u.images);
}
writeFileSync(productsPath, patched);
writeFileSync(resolve(__dirname, "image-hero-fixes.json"), JSON.stringify(updates, null, 2));
console.log("\nUpdated products.ts");
