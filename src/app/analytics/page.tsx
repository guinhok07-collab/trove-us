"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnalyticsGate } from "@/components/analytics-gate";
import { StoreIcon } from "@/components/icons";
import { stores, storeList } from "@/data/stores";
import { clearAnalytics, getAnalyticsSummary } from "@/lib/analytics";
import { StoreCategory } from "@/types/product";

type Summary = ReturnType<typeof getAnalyticsSummary>;

function AnalyticsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);

  function refresh() {
    setSummary(getAnalyticsSummary());
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!summary) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-[#78716c]">
        Loading stats...
      </div>
    );
  }

  const ranked = storeList
    .map((s) => ({ store: s, stats: summary[s.id] }))
    .sort((a, b) => b.stats.score - a.stats.score);

  const top = ranked[0];
  const hasData = ranked.some((r) => r.stats.score > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="section-title text-2xl">Owner Dashboard</h1>
          <p className="section-subtitle mt-1">
            Private stats — see which department performs best.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/admin"
            className="rounded-full border border-[#e7e5e4] px-4 py-2 text-sm font-semibold text-[#44403c] hover:border-[#5f8a7a]"
          >
            Operações
          </Link>
          <button
            type="button"
            onClick={() => {
              clearAnalytics();
              refresh();
            }}
            className="text-sm text-red-500 hover:underline"
          >
            Reset data
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="card p-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#a8a29e]">
            Analytics
          </p>
          <p className="mt-4 font-medium text-[#1c1917]">No data yet</p>
          <p className="mt-2 text-sm text-[#78716c]">
            Browse stores, view products, and add items to cart. Stats appear
            here automatically.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-flex px-6 py-3">
            Browse store
          </Link>
        </div>
      ) : (
        <>
          {top && top.stats.score > 0 && (
            <div className="mb-6 rounded-xl border-2 border-[#bbf7d0] bg-[#f0fdf4] p-5">
              <p className="text-sm font-semibold text-[#166534]">
                Current leader — focus here
              </p>
              <p className="mt-2 flex items-center gap-2 text-xl font-bold text-[#1c1917]">
                <StoreIcon store={top.store.id} size="sm" />
                {top.store.name}
              </p>
              <p className="mt-2 text-sm text-[#57534e]">
                Score: {top.stats.score} · {top.stats.addToCart} cart adds ·{" "}
                {top.stats.productViews} product views
              </p>
              <Link
                href={`/stores/${top.store.id}`}
                className="mt-3 inline-block text-sm font-semibold text-[#5f8a7a] hover:underline"
              >
                View winning store →
              </Link>
            </div>
          )}

          <div className="space-y-4">
            {ranked.map(({ store, stats }, i) => {
              const maxScore = ranked[0]?.stats.score || 1;
              const pct = Math.round((stats.score / maxScore) * 100);
              return (
                <div key={store.id} className="card p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-[#e7e5e4]">
                        #{i + 1}
                      </span>
                      <StoreIcon store={store.id} size="sm" />
                      <div>
                        <p className="font-bold text-[#1c1917]">{store.name}</p>
                        <p className="text-xs text-[#78716c]">{store.tagline}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[#5f8a7a]">
                      {stats.score} pts
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f5f5f4]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: stores[store.id as StoreCategory].color,
                      }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-[#faf9f7] p-2">
                      <p className="font-bold text-[#1c1917]">{stats.views}</p>
                      <p className="text-[#78716c]">Store visits</p>
                    </div>
                    <div className="rounded-lg bg-[#faf9f7] p-2">
                      <p className="font-bold text-[#1c1917]">
                        {stats.productViews}
                      </p>
                      <p className="text-[#78716c]">Product views</p>
                    </div>
                    <div className="rounded-lg bg-[#faf9f7] p-2">
                      <p className="font-bold text-[#1c1917]">
                        {stats.addToCart}
                      </p>
                      <p className="text-[#78716c]">Cart adds</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-xl border border-[#e7e5e4] bg-[#faf9f7] p-5 text-sm text-[#57534e]">
            <p className="font-semibold text-[#1c1917]">Scoring formula</p>
            <p className="mt-2">
              Store visit = 1 pt · Product view = 2 pts · Add to cart = 5 pts
            </p>
            <p className="mt-2 text-[#78716c]">
              After 30 days of ads, put 80% of budget on the top 1–2 stores.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <AnalyticsGate>
      <AnalyticsDashboard />
    </AnalyticsGate>
  );
}
