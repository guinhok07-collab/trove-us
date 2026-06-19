"use client";

import Link from "next/link";
import { AnalyticsGate } from "@/components/analytics-gate";
import { launchProducts, calcMargin } from "@/data/sourcing";
import { getProductBySlug } from "@/data/products";
import { formatUsd } from "@/lib/format";

function LaunchChecklist() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="section-title text-2xl">Launch Checklist</h1>
        <p className="section-subtitle mt-1">
          10 products to source on CJ Dropshipping first. Match each slug in{" "}
          <code className="text-xs">src/data/products.ts</code>.
        </p>
        <a
          href="https://cjdropshipping.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-semibold text-[#5f8a7a] hover:underline"
        >
          Open CJ Dropshipping →
        </a>
      </div>

      <div className="mb-6 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
        CJ filters: <strong>Ship From → United States</strong> · Sort by orders ·
        4+ stars
      </div>

      <div className="space-y-4">
        {launchProducts.map((item, i) => {
          const existing = getProductBySlug(item.slug);
          const midCost = (item.costMin + item.costMax) / 2;
          const { profit, marginPct } = calcMargin(
            item.sellPrice,
            midCost,
            item.shippingEst,
          );

          return (
            <div key={item.slug} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#a8a29e]">
                    #{i + 1} · {item.store}
                  </p>
                  <p className="mt-1 font-semibold text-[#1c1917]">
                    {existing?.name ?? item.slug}
                  </p>
                  <p className="mt-1 text-xs text-[#78716c]">
                    slug: <code>{item.slug}</code>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#eef4f1] px-3 py-1 text-sm font-semibold text-[#4d7366]">
                  {formatUsd(item.sellPrice)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-[#faf9f7] p-3">
                  <p className="text-xs font-semibold text-[#57534e]">
                    Search on CJ
                  </p>
                  <p className="mt-1 text-[#78716c]">{item.cjSearch}</p>
                </div>
                <div className="rounded-lg bg-[#faf9f7] p-3">
                  <p className="text-xs font-semibold text-[#57534e]">
                    Estimated margin
                  </p>
                  <p className="mt-1 text-[#78716c]">
                    Cost ${item.costMin}–{item.costMax} + ship ~$
                    {item.shippingEst} → profit ~{formatUsd(profit)} (
                    {marginPct.toFixed(0)}%)
                  </p>
                </div>
              </div>

              <p className="mt-3 text-xs text-[#a8a29e]">{item.notes}</p>

              {existing && (
                <Link
                  href={`/products/${item.slug}`}
                  className="mt-3 inline-block text-xs font-semibold text-[#5f8a7a] hover:underline"
                >
                  View on store →
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-[#e7e5e4] bg-[#faf9f7] p-5 text-sm text-[#57534e]">
        <p className="font-semibold text-[#1c1917]">After sourcing</p>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>Copy CJ image URL into products.ts</li>
          <li>Set price and supplierSku (CJ product ID)</li>
          <li>Rewrite description in your own words</li>
          <li>Test add-to-cart → checkout flow</li>
        </ol>
      </div>
    </div>
  );
}

export default function LaunchPage() {
  return (
    <AnalyticsGate>
      <LaunchChecklist />
    </AnalyticsGate>
  );
}
