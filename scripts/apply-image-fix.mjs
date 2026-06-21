import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixes = JSON.parse(
  readFileSync(resolve(__dirname, "image-fix-results.json"), "utf8"),
);

// Manual fallbacks for products CJ search missed on first pass
fixes["bamboo-drawer-dividers"] = {
  image:
    "https://cf.cjdropshipping.com/6edd0976-e92a-45f7-a817-1ba171c3a37b.jpg",
  images: [
    "https://cf.cjdropshipping.com/6edd0976-e92a-45f7-a817-1ba171c3a37b.jpg",
  ],
};
fixes["weighted-sleep-mask"] = {
  image: "https://cf.cjdropshipping.com/1612938746721.jpg",
  images: ["https://cf.cjdropshipping.com/1612938746721.jpg"],
};
fixes["ergonomic-wrist-rest"] = {
  image: "https://cf.cjdropshipping.com/20200717/570997564490.jpg",
  images: ["https://cf.cjdropshipping.com/20200717/570997564490.jpg"],
};
fixes["webcam-privacy-cover"] = {
  image:
    "https://oss-cf.cjdropshipping.com/product/2026/01/20/07/fb3eee90-5aed-4db0-8b2c-772b1312ea7d.jpg",
  images: [
    "https://oss-cf.cjdropshipping.com/product/2026/01/20/07/fb3eee90-5aed-4db0-8b2c-772b1312ea7d.jpg",
  ],
};

const productsPath = resolve(__dirname, "../src/data/products.ts");
let source = readFileSync(productsPath, "utf8");

for (const [slug, data] of Object.entries(fixes)) {
  if (!data?.image) continue;

  const slugIdx = source.indexOf(`slug: "${slug}"`);
  if (slugIdx === -1) {
    console.warn("slug not found:", slug);
    continue;
  }

  const nextSlug = source.indexOf('slug: "', slugIdx + 10);
  const blockEnd = nextSlug === -1 ? source.length : nextSlug;
  let block = source.slice(slugIdx, blockEnd);

  const imagesJson = JSON.stringify(data.images, null, 6).replace(
    /^/gm,
    "    ",
  );

  block = block.replace(
    /image: "https:\/\/[^"]+",/,
    `image: "${data.image}",`,
  );
  block = block.replace(
    /images: \[[\s\S]*?\],/,
    `images: ${imagesJson.trimStart()},`,
  );

  source = source.slice(0, slugIdx) + block + source.slice(blockEnd);
  console.log("updated", slug);
}

writeFileSync(productsPath, source);
