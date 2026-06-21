import { NextResponse } from "next/server";
import { products, storeLabels } from "@/data/products";
import { getCatalogVisibilityMap } from "@/lib/catalog/visible-products";
import {
  getVisibilityOverrides,
  isVisibilityStoreConfigured,
  setProductVisibility,
} from "@/lib/catalog/visibility-store";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const [visibility, overrides] = await Promise.all([
    getCatalogVisibilityMap(),
    getVisibilityOverrides(),
  ]);

  const catalog = products.map((product) => ({
    slug: product.slug,
    name: product.name,
    price: product.price,
    store: product.store,
    storeLabel: storeLabels[product.store],
    catalogHidden: Boolean(product.catalogHidden),
    visible: visibility[product.slug],
    hasOverride: product.slug in overrides,
  }));

  const visibleCount = catalog.filter((entry) => entry.visible).length;

  return NextResponse.json({
    ok: true,
    redisConfigured: isVisibilityStoreConfigured(),
    visibleCount,
    hiddenCount: catalog.length - visibleCount,
    products: catalog,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const body = (await request.json()) as { slug?: string; visible?: boolean };
  const slug = body.slug?.trim();
  const visible = body.visible;

  if (!slug || typeof visible !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Informe slug e visible (true/false)." },
      { status: 400 },
    );
  }

  const product = products.find((entry) => entry.slug === slug);
  if (!product) {
    return NextResponse.json(
      { ok: false, error: "Produto não encontrado." },
      { status: 404 },
    );
  }

  await setProductVisibility(slug, visible);
  const visibility = await getCatalogVisibilityMap();

  return NextResponse.json({
    ok: true,
    slug,
    visible: visibility[slug],
  });
}
