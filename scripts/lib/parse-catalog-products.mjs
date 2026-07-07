import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractProductBlock } from "./cj-catalog-lib.mjs";
import { defaultHiddenForSlug } from "./catalog-visibility.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const productsPath = resolve(__dirname, "../../src/data/products.ts");

export function loadVisibleProducts() {
  const source = readFileSync(productsPath, "utf8");
  const slugs = [...source.matchAll(/slug: "([^"]+)"/g)].map((m) => m[1]);
  const products = [];

  for (const slug of slugs) {
    const hit = extractProductBlock(source, slug);
    if (!hit) continue;

    const block = hit.block;
    const catalogHidden = /catalogHidden:\s*true/.test(block);
    if (defaultHiddenForSlug(slug, catalogHidden)) continue;

    const name = block.match(/name: "([^"]+)"/)?.[1] ?? slug;
    const description = block.match(/description: "([^"]+)"/)?.[1] ?? "";
    const price = Number(block.match(/price: ([\d.]+)/)?.[1] ?? 0);
    const compareAtPrice = block.match(/compareAtPrice: ([\d.]+)/)?.[1];
    const store = block.match(/store: "([^"]+)"/)?.[1] ?? "home";
    const image = block.match(/image: "(https:[^"]+)"/)?.[1] ?? "";
    const tagsMatch = block.match(/tags: \[([^\]]*)\]/);
    const tags = tagsMatch
      ? [...tagsMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
      : [];
    const inStock = !/inStock:\s*false/.test(block);

    if (!image || !price || !inStock) continue;

    products.push({
      slug,
      name,
      description,
      price,
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      store,
      image,
      tags,
      url: `https://trove-us.com/products/${slug}`,
    });
  }

  return products;
}
