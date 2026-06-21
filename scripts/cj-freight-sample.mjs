/** Sample CJ freight for a few catalog variants. Run: npx vercel env run --environment production -- node scripts/cj-freight-sample.mjs */

const API = "https://developers.cjdropshipping.com/api2.0/v1";
const key = process.env.CJ_API_KEY?.trim();

if (!key) {
  console.error("CJ_API_KEY missing");
  process.exit(1);
}

const samples = [
  { name: "Orthopedic dog bed", vid: "1763402968285589504" },
  { name: "LED night light", vid: "1506976686821355520" },
  { name: "Keyboard wrist rest", vid: "1357500854957117440" },
  { name: "Mini massage gun", vid: "1358613634581925888" },
];

const zips = [
  { label: "NYC", zip: "10001" },
  { label: "LA", zip: "90210" },
  { label: "Miami", zip: "33101" },
];

const auth = await fetch(`${API}/authentication/getAccessToken`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ apiKey: key }),
}).then((r) => r.json());

const token = auth.data?.accessToken;
if (!token) {
  console.error("Auth failed:", auth.message);
  process.exit(1);
}

console.log("\nCJ freightCalculate — US warehouse → US customer\n");
console.log("Product".padEnd(24), "ZIP", "Cheapest", "Options");
console.log("-".repeat(72));

for (const sample of samples) {
  for (const { label, zip } of zips) {
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
        products: [{ vid: sample.vid, quantity: 1 }],
      }),
    }).then((r) => r.json());

    const options = [...(res.data ?? [])].sort(
      (a, b) => a.logisticPrice - b.logisticPrice,
    );
    const cheapest = options[0];
    const summary = cheapest
      ? `$${cheapest.logisticPrice.toFixed(2)} (${cheapest.logisticName})`
      : res.message || "no options";

    console.log(
      sample.name.padEnd(24),
      label.padEnd(4),
      summary.padEnd(28),
      `${options.length} carriers`,
    );
  }
  console.log("");
}

console.log(
  "Note: Trove currently charges customers $4.99 flat (<$35) or $0 (≥$35).\n" +
    "CJ cost above is what YOU pay from wallet when order fulfills.\n",
);
