/**
 * CJ freight report for full Trove catalog.
 * Run: npx vercel env run --environment production -- node scripts/cj-freight-report.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = "https://developers.cjdropshipping.com/api2.0/v1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ZIPS = [
  { id: "nyc", label: "New York", zip: "10001" },
  { id: "la", label: "Los Angeles", zip: "90210" },
  { id: "miami", label: "Miami", zip: "33101" },
  { id: "houston", label: "Houston", zip: "77001" },
];

const STORE_LABELS = {
  pet: "Pet",
  home: "Home",
  wellness: "Wellness",
  tech: "Tech",
};

function parseProducts() {
  const raw = readFileSync(resolve(__dirname, "../src/data/products.ts"), "utf8");
  const blocks = raw.split(/\n  \{\n/).slice(1);
  const products = [];

  for (const block of blocks) {
    const slug = block.match(/slug: "([^"]+)"/)?.[1];
    const name = block.match(/name: "([^"]+)"/)?.[1];
    const price = Number(block.match(/price: ([0-9.]+)/)?.[1]);
    const store = block.match(/store: "([^"]+)"/)?.[1];
    const cjVid = block.match(/cjVid: "([^"]+)"/)?.[1];
    if (!slug || !name || !store || !cjVid) continue;
    products.push({ slug, name, price, store, cjVid });
  }

  return products;
}

async function getToken(apiKey) {
  const res = await fetch(`${API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });
  const json = await res.json();
  if (!json.data?.accessToken) {
    throw new Error(json.message || "CJ auth failed");
  }
  return json.data.accessToken;
}

async function fetchFreight(token, vid, zip, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(`${API}/logistic/freightCalculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "CJ-Access-Token": token,
        },
        body: JSON.stringify({
          startCountryCode: "US",
          endCountryCode: "US",
          zip,
          products: [{ vid, quantity: 1 }],
        }),
      });
      const json = await res.json();

      if (json.message?.includes("Too Many Requests")) {
        await sleep(1500 * (attempt + 1));
        continue;
      }

      const options = [...(json.data ?? [])].sort(
        (a, b) => a.logisticPrice - b.logisticPrice,
      );
      const cheapest = options[0];

      return {
        ok: Boolean(cheapest),
        error: cheapest ? undefined : json.message || "No shipping options",
        cheapest: cheapest
          ? {
              price: cheapest.logisticPrice,
              carrier: cheapest.logisticName,
              aging: cheapest.logisticAging ?? null,
            }
          : null,
        optionCount: options.length,
      };
    } catch (error) {
      if (attempt === retries - 1) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Network error",
          cheapest: null,
          optionCount: 0,
        };
      }
      await sleep(2000 * (attempt + 1));
    }
  }

  return { ok: false, error: "Rate limited", cheapest: null, optionCount: 0 };
}

function avg(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function percentile(nums, p) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function money(n) {
  return n == null ? "—" : `$${n.toFixed(2)}`;
}

function buildMarkdown(report) {
  const { generatedAt, products, summary, policy } = report;
  const lines = [];

  lines.push("# Trove — Relatório de frete CJ (US → US)");
  lines.push("");
  lines.push(`Gerado em: ${generatedAt}`);
  lines.push(`Produtos analisados: **${products.length}**`);
  lines.push(`ZIPs: NYC (10001), LA (90210), Miami (33101), Houston (77001)`);
  lines.push("");
  lines.push("## Política atual do site vs custo CJ");
  lines.push("");
  lines.push("| Regra Trove | Valor |");
  lines.push("|-------------|-------|");
  lines.push(`| Frete grátis acima de | **$${policy.freeShippingMin}** |`);
  lines.push(`| Frete fixo abaixo disso | **$${policy.flatShipping}** (cliente paga) |`);
  lines.push(
    `| CJ cobra de você | $${summary.overall.min?.toFixed(2) ?? "?"}–$${summary.overall.max?.toFixed(2) ?? "?"} (por produto/ZIP) |`,
  );
  lines.push("");
  lines.push("## Resumo geral (frete CJ mais barato por consulta)");
  lines.push("");
  lines.push("| Métrica | Valor |");
  lines.push("|---------|-------|");
  lines.push(`| Mínimo | ${money(summary.overall.min)} |`);
  lines.push(`| Média | ${money(summary.overall.avg)} |`);
  lines.push(`| Mediana | ${money(summary.overall.median)} |`);
  lines.push(`| Máximo | ${money(summary.overall.max)} |`);
  lines.push(`| Falhas API | ${summary.failures} |`);
  lines.push("");

  lines.push("## Por região (média do frete mais barato)");
  lines.push("");
  lines.push("| Região | ZIP | Média | Mediana | Min | Max |");
  lines.push("|--------|-----|-------|---------|-----|-----|");
  for (const zone of summary.byZip) {
    lines.push(
      `| ${zone.label} | ${zone.zip} | ${money(zone.avg)} | ${money(zone.median)} | ${money(zone.min)} | ${money(zone.max)} |`,
    );
  }
  lines.push("");

  lines.push("## Por categoria");
  lines.push("");
  lines.push("| Categoria | Produtos | Frete médio CJ | Min | Max |");
  lines.push("|-----------|----------|----------------|-----|-----|");
  for (const cat of summary.byStore) {
    lines.push(
      `| ${cat.label} | ${cat.count} | ${money(cat.avg)} | ${money(cat.min)} | ${money(cat.max)} |`,
    );
  }
  lines.push("");

  lines.push("## Impacto na margem (política $35 / $4.99)");
  lines.push("");
  lines.push("| Cenário | % produtos | Detalhe |");
  lines.push("|---------|------------|---------|");
  lines.push(
    `| CJ > $4.99 (cliente paga $4.99) | **${summary.policyImpact.aboveFlatRatePct}%** | Você subsidia ou perde no frete em pedidos pequenos |`,
  );
  lines.push(
    `| CJ > $4.99 com frete grátis (≥$35) | **${summary.policyImpact.freeShippingLossPct}%** | Cliente paga $0; você absorve todo o frete CJ |`,
  );
  lines.push(
    `| Preço ≥ $35 (elegível frete grátis) | **${summary.policyImpact.productsOver35Pct}%** do catálogo | ${summary.policyImpact.productsOver35Count} produtos |`,
  );
  lines.push("");

  lines.push("## Top 10 — frete CJ mais caro (média entre ZIPs)");
  lines.push("");
  lines.push("| Produto | Categoria | Preço venda | Frete CJ médio |");
  lines.push("|---------|-----------|-------------|----------------|");
  for (const row of summary.topExpensive) {
    lines.push(
      `| ${row.name} | ${row.store} | ${money(row.price)} | ${money(row.avgFreight)} |`,
    );
  }
  lines.push("");

  lines.push("## Top 10 — frete CJ mais barato");
  lines.push("");
  lines.push("| Produto | Categoria | Preço venda | Frete CJ médio |");
  lines.push("|---------|-----------|-------------|----------------|");
  for (const row of summary.topCheap) {
    lines.push(
      `| ${row.name} | ${row.store} | ${money(row.price)} | ${money(row.avgFreight)} |`,
    );
  }
  lines.push("");

  lines.push("## Recomendações");
  lines.push("");
  for (const rec of summary.recommendations) {
    lines.push(`- ${rec}`);
  }
  lines.push("");

  lines.push("## Detalhe por produto");
  lines.push("");
  lines.push("| Produto | Cat. | Venda | NYC | LA | Miami | Houston | Média |");
  lines.push("|---------|------|-------|-----|----|-------|---------|-------|");
  for (const p of products) {
    const cols = ZIPS.map((z) => {
      const q = p.quotes[z.id];
      return q?.cheapest ? money(q.cheapest.price) : "ERR";
    });
    lines.push(
      `| ${p.name.slice(0, 40)} | ${STORE_LABELS[p.store] ?? p.store} | ${money(p.price)} | ${cols.join(" | ")} | ${money(p.avgFreight)} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

const apiKey = process.env.CJ_API_KEY?.trim();
if (!apiKey) {
  console.error("CJ_API_KEY missing");
  process.exit(1);
}

const outDir = resolve(__dirname, "../reports");
mkdirSync(outDir, { recursive: true });
const progressPath = resolve(outDir, "cj-freight-progress.json");

const catalog = parseProducts();
console.log(`\nConsultando frete CJ para ${catalog.length} produtos × ${ZIPS.length} ZIPs...\n`);
console.log("(~1 req/s por limite da API — pode levar alguns minutos)\n");

const token = await getToken(apiKey);
const progress = existsSync(progressPath)
  ? JSON.parse(readFileSync(progressPath, "utf8"))
  : { done: {} };

const results = [];
let failures = 0;
let done = Object.keys(progress.done).length;
const total = catalog.length * ZIPS.length;

for (const product of catalog) {
  const quotes = {};
  const prices = [];

  for (const zone of ZIPS) {
    const key = `${product.slug}:${zone.id}`;
    if (progress.done[key]) {
      quotes[zone.id] = progress.done[key];
      if (progress.done[key].cheapest) prices.push(progress.done[key].cheapest.price);
      continue;
    }

    const quote = await fetchFreight(token, product.cjVid, zone.zip);
    quotes[zone.id] = quote;
    progress.done[key] = quote;
    writeFileSync(progressPath, JSON.stringify(progress));

    if (quote.cheapest) prices.push(quote.cheapest.price);
    else failures++;
    done++;
    if (done % 10 === 0) {
      process.stdout.write(`  ${done}/${total} consultas...\r`);
    }
    await sleep(1100);
  }

  results.push({
    ...product,
    quotes,
    avgFreight: avg(prices),
    minFreight: prices.length ? Math.min(...prices) : null,
    maxFreight: prices.length ? Math.max(...prices) : null,
  });
}

console.log(`\nConcluído: ${done} consultas, ${failures} falhas\n`);

const allPrices = results.flatMap((p) => {
  return ZIPS.map((z) => p.quotes[z.id]?.cheapest?.price).filter(
    (n) => typeof n === "number",
  );
});

const byZip = ZIPS.map((zone) => {
  const nums = results
    .map((p) => p.quotes[zone.id]?.cheapest?.price)
    .filter((n) => typeof n === "number");
  return {
    id: zone.id,
    label: zone.label,
    zip: zone.zip,
    avg: avg(nums),
    median: percentile(nums, 50),
    min: nums.length ? Math.min(...nums) : null,
    max: nums.length ? Math.max(...nums) : null,
  };
});

const storeIds = ["pet", "home", "wellness", "tech"];
const byStore = storeIds.map((store) => {
  const rows = results.filter((p) => p.store === store && p.avgFreight != null);
  const nums = rows.map((p) => p.avgFreight);
  return {
    store,
    label: STORE_LABELS[store],
    count: rows.length,
    avg: avg(nums),
    min: nums.length ? Math.min(...nums) : null,
    max: nums.length ? Math.max(...nums) : null,
  };
});

const ranked = [...results]
  .filter((p) => p.avgFreight != null)
  .sort((a, b) => b.avgFreight - a.avgFreight);

const aboveFlat = results.filter((p) => p.minFreight != null && p.minFreight > 4.99);
const freeShippingLoss = results.filter(
  (p) => p.price >= 35 && p.avgFreight != null && p.avgFreight > 4.99,
);
const productsOver35 = results.filter((p) => p.price >= 35);

const overallAvg = avg(allPrices);
const recommendations = [];

if (overallAvg != null && overallAvg > 4.99) {
  recommendations.push(
    `Frete CJ médio (${money(overallAvg)}) é maior que os $4.99 cobrados em pedidos pequenos — considere subir para $${Math.ceil(overallAvg + 1)} ou $${Math.ceil(overallAvg + 2)}.`,
  );
}

if (freeShippingLoss.length > results.length * 0.5) {
  recommendations.push(
    `Mais da metade do catálogo com frete grátis (≥$35) ainda custa >$4.99 na CJ — avalie subir o mínimo para $49–$59 ou embutir frete no preço.`,
  );
}

if (byStore.find((s) => s.store === "wellness")?.avg > 6) {
  recommendations.push(
    "Wellness tende a ser mais pesado (massage guns etc.) — frete grátis universal pode comer margem nessa categoria.",
  );
}

recommendations.push(
  "Para precisão total no checkout: calcular frete CJ real após o cliente informar ZIP (antes do PayPal).",
);

recommendations.push(
  "Manter $35/$4.99 é ok se margem dos produtos já incluir ~$5–8 de buffer de frete.",
);

const report = {
  generatedAt: new Date().toISOString(),
  policy: { freeShippingMin: 35, flatShipping: 4.99 },
  products: results,
  summary: {
    failures,
    overall: {
      min: allPrices.length ? Math.min(...allPrices) : null,
      max: allPrices.length ? Math.max(...allPrices) : null,
      avg: overallAvg,
      median: percentile(allPrices, 50),
    },
    byZip,
    byStore,
    policyImpact: {
      aboveFlatRatePct: Math.round((aboveFlat.length / results.length) * 100),
      freeShippingLossPct: Math.round((freeShippingLoss.length / results.length) * 100),
      productsOver35Pct: Math.round((productsOver35.length / results.length) * 100),
      productsOver35Count: productsOver35.length,
    },
    topExpensive: ranked.slice(0, 10).map((p) => ({
      name: p.name,
      store: STORE_LABELS[p.store],
      price: p.price,
      avgFreight: p.avgFreight,
    })),
    topCheap: ranked
      .slice(-10)
      .reverse()
      .map((p) => ({
        name: p.name,
        store: STORE_LABELS[p.store],
        price: p.price,
        avgFreight: p.avgFreight,
      })),
    recommendations,
  },
};

const jsonPath = resolve(outDir, "cj-freight-report.json");
const mdPath = resolve(outDir, "cj-freight-report.md");

writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(mdPath, buildMarkdown(report));
try {
  writeFileSync(progressPath, JSON.stringify({ done: {} }));
} catch {
  /* ignore */
}

console.log("Resumo:");
console.log(`  Frete CJ — min: ${money(report.summary.overall.min)}, avg: ${money(report.summary.overall.avg)}, max: ${money(report.summary.overall.max)}`);
console.log(`  Produtos com CJ > $4.99: ${report.summary.policyImpact.aboveFlatRatePct}%`);
console.log(`  Produtos ≥$35 com frete CJ > $4.99: ${report.summary.policyImpact.freeShippingLossPct}%`);
console.log("");
console.log(`JSON: ${jsonPath}`);
console.log(`Markdown: ${mdPath}`);
