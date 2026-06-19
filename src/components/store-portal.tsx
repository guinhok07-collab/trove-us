"use client";

import Link from "next/link";
import { copy } from "@/data/brand";
import { StoreIcon } from "@/components/icons";
import { Store } from "@/types/product";

interface StorePortalProps {
  store: Store;
  productCount: number;
}

export function StorePortal({ store, productCount }: StorePortalProps) {
  return (
    <Link
      href={`/stores/${store.id}`}
      className="group card flex flex-col p-6 transition duration-300 hover:border-[#5f8a7a]/30 hover:shadow-[0_8px_30px_rgb(28_25_23_/6%)]"
    >
      <span
        className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${store.bgGradient}`}
      >
        <StoreIcon store={store.id} size="sm" variant="white" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-[#1c1917] group-hover:text-[#4d7366]">
        {store.name}
      </h3>
      <p className="mt-1 text-sm text-[#78716c]">{store.tagline}</p>
      <p className="mt-3 line-clamp-2 flex-1 text-sm leading-relaxed text-[#a8a29e]">
        {store.description}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-[#f5f5f4] pt-4">
        <span className="text-xs font-medium text-[#a8a29e]">
          {productCount} items
        </span>
        <span className="text-sm font-semibold text-[#5f8a7a] group-hover:text-[#4d7366]">
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
      <p className="section-subtitle mt-2">{copy.shopDepartmentsSub}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stores.map((store) => (
          <StorePortal
            key={store.id}
            store={store}
            productCount={counts[store.id] ?? 0}
          />
        ))}
      </div>
    </section>
  );
}
