/**
 * Register trove-us.com on Resend and print DNS records for Namecheap/Vercel.
 * Run: npx vercel env run -- node scripts/setup-resend-domain.mjs
 */
const key = process.env.RESEND_API_KEY?.trim();
const domain = "trove-us.com";

if (!key) {
  console.error("RESEND_API_KEY missing. Run: npx vercel env run -- node scripts/setup-resend-domain.mjs");
  process.exit(1);
}

async function api(path, options = {}) {
  const res = await fetch(`https://api.resend.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

const list = await api("/domains");
let existing = list.data?.find((d) => d.name === domain);

if (!existing) {
  console.log(`Creating domain ${domain} on Resend...`);
  const created = await api("/domains", {
    method: "POST",
    body: JSON.stringify({ name: domain, region: "us-east-1" }),
  });
  existing = created;
}

const detail = await api(`/domains/${existing.id}`);
const records = detail.records ?? [];

console.log("\n=== Resend domain ===");
console.log("Name:", detail.name);
console.log("Status:", detail.status);
console.log("ID:", detail.id);

console.log("\n=== DNS records (add in Namecheap → Advanced DNS) ===\n");
for (const r of records) {
  console.log(`Type: ${r.type}`);
  console.log(`Host: ${r.name}`);
  console.log(`Value: ${r.value}`);
  if (r.priority != null) console.log(`Priority: ${r.priority}`);
  console.log("---");
}

console.log("\nAfter adding records, verify:");
console.log(`curl -X POST https://api.resend.com/domains/${existing.id}/verify -H "Authorization: Bearer $RESEND_API_KEY"`);
