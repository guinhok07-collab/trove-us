import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { products, storeLabels } from "@/data/products";
import catalogStandards from "@/data/catalog-standards.json";
import { getCatalogVisibilityMap } from "@/lib/catalog/visible-products";
import {
  getVisibilityOverrides,
  isVisibilityStoreConfigured,
  setProductVisibility,
} from "@/lib/catalog/visibility-store";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

type MediaAuditIssue = {
  slug: string;
  level: "error" | "warn";
  messages: string[];
  name?: string;
  imageCount?: number;
  variantCount?: number;
};

function loadMediaAudit() {
  try {
    const raw = readFileSync(
      join(process.cwd(), "src/data/catalog-media-audit.json"),
      "utf8",
    );
    return JSON.parse(raw) as {
      summary: {
        auditedAt: string;
        total: number;
        ok: number;
        issueCount: number;
        errors: number;
        warnings: number;
        minImages: number;
      };
      issues: MediaAuditIssue[];
    };
  } catch {
    return null;
  }
}
function loadCjAudit() {
  try {
    const raw = readFileSync(
      join(process.cwd(), "src/data/catalog-cj-audit.json"),
      "utf8",
    );
    return JSON.parse(raw) as {
      summary: {
        auditedAt: string;
        total: number;
        ok: number;
        issueCount: number;
        errors: number;
        warnings: number;
        nameMismatch: number;
        variantGap: number;
      };
      issues: Array<{
        slug: string;
        level: "error" | "warn";
        messages: string[];
        types?: string[];
        cjName?: string;
        overlap?: number;
      }>;
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const auth = await requireOwnerAuth();
  if (auth) return auth;

  const [visibility, overrides] = await Promise.all([
    getCatalogVisibilityMap(),
    getVisibilityOverrides(),
  ]);

  const mediaAudit = loadMediaAudit();
  const cjAudit = loadCjAudit();
  const mediaBySlug = new Map(
    (mediaAudit?.issues ?? []).map((issue) => [issue.slug, issue]),
  );
  const cjBySlug = new Map((cjAudit?.issues ?? []).map((issue) => [issue.slug, issue]));

  const catalog = products.map((product) => {
    const mediaIssue = mediaBySlug.get(product.slug);
    const cjIssue = cjBySlug.get(product.slug);
    return {
      slug: product.slug,
      name: product.name,
      price: product.price,
      store: product.store,
      storeLabel: storeLabels[product.store],
      catalogHidden: Boolean(product.catalogHidden),
      visible: visibility[product.slug],
      hasOverride: product.slug in overrides,
      mediaIssue: mediaIssue
        ? { level: mediaIssue.level, messages: mediaIssue.messages }
        : null,
      cjIssue: cjIssue
        ? {
            level: cjIssue.level,
            messages: cjIssue.messages,
            types: cjIssue.types ?? [],
            cjName: cjIssue.cjName,
            overlap: cjIssue.overlap,
          }
        : null,
    };
  });

  const visibleCount = catalog.filter((entry) => entry.visible).length;

  return NextResponse.json({
    ok: true,
    redisConfigured: isVisibilityStoreConfigured(),
    visibleCount,
    hiddenCount: catalog.length - visibleCount,
    products: catalog,
    standards: catalogStandards,
    mediaAudit: mediaAudit?.summary ?? null,
    mediaIssues: mediaAudit?.issues ?? [],
    cjAudit: cjAudit?.summary ?? null,
    cjIssues: cjAudit?.issues ?? [],
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
