"use client";

import Link from "next/link";
import { copy } from "@/data/brand";
import { StoreIcon } from "@/components/icons";
import { Store } from "@/types/product";

interface StorePortalProps {
  store: Store;
  productCount: number;
  compact?: boolean;
}

export function StorePortal({ store, productCount, compact = false }: StorePortalProps) {
  return (
    <Link
      href={`/stores/${store.id}`}
      className={`group card flex flex-col transition duration-300 hover:border-[#5f8a7a]/30 hover:shadow-[0_8px_30px_rgb(28_25_23_/6%)] ${
        compact ? "h-full p-4" : "p-6"
      }`}
    >
      <span
        className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${store.bgGradient} ${
          compact ? "h-9 w-9" : "h-12 w-12 rounded-2xl"
        }`}
      >
        <StoreIcon store={store.id} size="sm" variant="white" />
      </span>
      <h3
        className={`font-semibold text-[#1c1917] group-hover:text-[#4d7366] ${
          compact ? "mt-3 text-sm" : "mt-4 text-base"
        }`}
      >
        {store.name}
      </h3>
      <p className={`text-[#78716c] ${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>
        {store.tagline}
      </p>
      <p
        className={`hidden flex-1 leading-relaxed text-[#a8a29e] sm:line-clamp-2 ${
          compact ? "text-xs" : "mt-3 text-sm"
        }`}
      >
        {store.description}
      </p>
      <div
        className={`flex items-center justify-between border-t border-[#f5f5f4] ${
          compact ? "mt-3 pt-3" : "mt-5 pt-4"
        }`}
      >
        <span className="text-[11px] font-medium text-[#a8a29e] sm:text-xs">
          {productCount} items
        </span>
        <span className="text-xs font-semibold text-[#5f8a7a] group-hover:text-[#4d7366] sm:text-sm">
          {copy.departmentCta} →
        </span>
      </div>
    </Link>
  );
}

export function StorePortalGrid({
  stores,
  counts,
}: {
  stores: Store[];
  counts: Record<string, number>;
}) {
  return (
    <section>
      <h2 className="section-title">{copy.shopDepartments}</h2>
      <p className="section-subtitle mt-1 hidden text-xs sm:mt-2 sm:block sm:text-[15px]">
        {copy.shopDepartmentsSub}
      </p>
      <div className="scroll-fade-x mt-3 sm:mt-6">
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-4 scrollbar-none sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pr-0 lg:grid-cols-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className="w-[72vw] max-w-[16rem] shrink-0 snap-start sm:w-auto sm:max-w-none"
            >
              <StorePortal
                store={store}
                productCount={counts[store.id] ?? 0}
                compact
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
