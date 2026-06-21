import { NextResponse } from "next/server";
import { getCjAccessToken } from "@/lib/cj/token";
import { CJ_API_BASE } from "@/lib/cj/types";
import { requireOwnerAuth } from "@/lib/require-owner-auth";

interface CjListProduct {
  id: string;
  nameEn: string;
  sku: string;
  sellPrice?: string;
  nowPrice?: string;
  listedNum?: number;
  bigImage?: string;
}

interface CjVariant {
  vid: string;
  variantSku: string;
  variantKey?: string;
  variantNameEn?: string;
  variantSellPrice?: number | string;
  variantImage?: string;
}

async function cjGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${CJ_API_BASE}${path}`, {
    headers: { "CJ-Access-Token": token },
    cache: "no-store",
  });
  const json = await res.json();
  if (!json.result) {
    throw new Error(json.message || `CJ error: ${path}`);
  }
  return json.data as T;
}

export async function GET(request: Request) {
  const denied = await requireOwnerAuth();
  if (denied) return denied;

  const apiKey = process.env.CJ_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "CJ not configured." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const keyWord = searchParams.get("q")?.trim();
  const slug = searchParams.get("slug")?.trim();

  if (!keyWord) {
    return NextResponse.json({ error: "Missing q parameter." }, { status: 400 });
  }

  try {
    const token = await getCjAccessToken(apiKey);
    const params = new URLSearchParams({
      page: "1",
      size: "5",
      keyWord,
      countryCode: "US",
      orderBy: "1",
      sort: "desc",
    });

    const list = await cjGet<{
      content?: Array<{ productList?: CjListProduct[] }>;
    }>(`/product/listV2?${params}`, token);

    const products =
      list.content?.flatMap((group) => group.productList ?? []) ?? [];

    if (!products.length) {
      return NextResponse.json({ slug, keyWord, found: false, products: [] });
    }

    const top = products[0];
    const detail = await cjGet<{ pid: string; variants?: CjVariant[] }>(
      `/product/query?productSku=${encodeURIComponent(top.sku)}&countryCode=US`,
      token,
    );

    const variant = detail.variants?.[0];

    return NextResponse.json({
      slug,
      keyWord,
      found: true,
      product: {
        pid: top.id ?? detail.pid,
        name: top.nameEn,
        sku: top.sku,
        sellPrice: top.sellPrice ?? top.nowPrice,
        listedNum: top.listedNum,
        image: variant?.variantImage ?? top.bigImage,
        cjVid: variant?.vid,
        cjSku: variant?.variantSku,
        variantLabel: variant?.variantKey ?? variant?.variantNameEn,
        variantPrice: variant?.variantSellPrice,
        url: `https://cjdropshipping.com/search/${encodeURIComponent(keyWord)}.html`,
      },
      alternates: products.slice(1, 4).map((p) => ({
        name: p.nameEn,
        sku: p.sku,
        sellPrice: p.sellPrice ?? p.nowPrice,
        listedNum: p.listedNum,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "CJ product search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
