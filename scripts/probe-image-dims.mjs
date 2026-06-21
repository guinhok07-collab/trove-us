/** Fetch image dimensions via partial download */
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const curated = JSON.parse(readFileSync(resolve(__dirname, "cj-restore-curated.json"), "utf8"));

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
    const kb = Number(r.headers.get("content-length") || buf.length) / 1024;
    return { url, ...d, kb: kb || buf.length / 1024 };
  } catch (e) {
    return { url, w: 0, h: 0, kb: 0, err: String(e) };
  }
}

for (const [slug, p] of Object.entries(curated)) {
  const all = [...new Set([p.image, ...p.images])];
  const results = await Promise.all(all.map(dims));
  results.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  console.log(`\n=== ${slug} ===`);
  for (const r of results) {
    const hero = r.url === p.image ? " *HERO*" : "";
    const px = r.w ? `${r.w}x${r.h}` : "?";
    console.log(`${px.padStart(10)} ${hero} ${r.url.slice(-60)}`);
  }
}
