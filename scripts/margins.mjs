/** Run: node scripts/margins.mjs */

const launch = [
  { name: "Orthopedic dog bed", sell: 49.99, cost: 19, ship: 5 },
  { name: "No-pull harness", sell: 27.99, cost: 9, ship: 4 },
  { name: "Pet fountain", sell: 34.99, cost: 14, ship: 5 },
  { name: "Closet organizer", sell: 32.99, cost: 10, ship: 4 },
  { name: "LED night light", sell: 19.99, cost: 6, ship: 3 },
  { name: "Massage gun", sell: 59.99, cost: 23, ship: 5 },
  { name: "Foam roller", sell: 29.99, cost: 8, ship: 4 },
  { name: "Laptop stand", sell: 39.99, cost: 13, ship: 4 },
  { name: "USB-C hub", sell: 44.99, cost: 15, ship: 3 },
  { name: "Wrist rest", sell: 24.99, cost: 7, ship: 3 },
];

console.log("\nTrove — Launch product margins (mid cost estimate)\n");
console.log("Product".padEnd(22), "Sell", "Cost+Ship", "Profit", "Margin");
console.log("-".repeat(58));

for (const p of launch) {
  const fee = p.sell * 0.034;
  const total = p.cost + p.ship + fee;
  const profit = p.sell - total;
  const margin = ((profit / p.sell) * 100).toFixed(0);
  console.log(
    p.name.padEnd(22),
    `$${p.sell}`.padStart(6),
    `$${total.toFixed(2)}`.padStart(9),
    `$${profit.toFixed(2)}`.padStart(7),
    `${margin}%`.padStart(6),
  );
}

console.log("\nRule: aim for 40%+ margin after cost + ship + PayPal (~3.4%)\n");
