/** Probe image byte sizes for restored products */
const curated = JSON.parse(
  await import("fs").then((m) => m.readFileSync(new URL("./cj-restore-curated.json", import.meta.url), "utf8")),
);

async function probe(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    const len = Number(r.headers.get("content-length") || 0);
    return { url, len, ok: r.ok, type: r.headers.get("content-type") };
  } catch {
    return { url, len: 0, ok: false };
  }
}

for (const [slug, p] of Object.entries(curated)) {
  console.log(`\n=== ${slug} (hero: ${p.image.slice(-40)}) ===`);
  const all = [...new Set([p.image, ...p.images])];
  const results = await Promise.all(all.map(probe));
  results.sort((a, b) => b.len - a.len);
  for (const r of results.slice(0, 6)) {
    const mark = r.url === p.image ? " *HERO*" : "";
    console.log(`${(r.len / 1024).toFixed(1)}KB${mark} ${r.url.slice(-55)}`);
  }
}
