<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Trove (techdrop-us) — agent notes

Store: https://trove-us.com · CJ Dropshipping · PayPal live · Vercel.

## Catalog changes (mandatory)

Before **any** commit/deploy touching `products.ts`, `product-variants.json`, or CJ scripts:

```bash
npm run catalog:check
```

Full CJ price verification (slow, needs `CJ_API_KEY` in `.env.local`):

```bash
npm run catalog:check:cj
```

See `.cursor/rules/trove-catalog.mdc` for pricing formula, relink workflow, and UI standards.

## Key paths

- Catalog: `src/data/products.ts`, `src/data/product-variants.json`
- Copy source: `scripts/product-copy.json`
- CJ lib: `scripts/lib/cj-catalog-lib.mjs`
- Pricing (app): `src/lib/pricing.ts`
- Variant picker: `src/components/product-variant-picker.tsx`
