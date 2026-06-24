import Link from "next/link";
import { Icon } from "@/components/icons";
import { storeList, storeShortNames } from "@/data/stores";

interface MobileCategoryGridProps {
  embedded?: boolean;
  onNavigate?: () => void;
}

/** Mobile — 2×2 grid; use in bottom sheet or homepage section */
export function MobileCategoryGrid({ embedded = false, onNavigate }: MobileCategoryGridProps) {
  const linkProps = onNavigate ? { onClick: onNavigate } : {};

  return (
    <div
      className={
        embedded
          ? "px-2 pb-2"
          : "border-t border-[#e7e5e4]/60 bg-[#fafaf9] px-3 py-3 md:hidden"
      }
    >
      {!embedded ? (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#a8a29e]">
          Shop by category
        </p>
      ) : null}
      <Link
        href="/products"
        {...linkProps}
        className="mb-2 flex min-h-11 items-center justify-center rounded-xl bg-[#1c1917] text-sm font-semibold text-white"
      >
        All products
      </Link>
      <div className="grid grid-cols-2 gap-2">
        {storeList.map((store) => (
          <Link
            key={store.id}
            href={`/stores/${store.id}`}
            {...linkProps}
            className={`flex min-h-[3.25rem] items-center gap-2.5 rounded-xl border border-[#e7e5e4]/80 bg-gradient-to-br p-3 ${store.bgGradient}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/85 shadow-sm">
              <Icon name={store.id} size={18} className="text-[#4d7366]" />
            </span>
            <span className="text-sm font-semibold leading-tight text-[#1c1917]">
              {storeShortNames[store.id]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Tablet/desktop — compact horizontal pills */
export function DesktopCategoryPills() {
  return (
    <div className="hidden border-t border-[#e7e5e4]/60 bg-white/60 md:block">
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2 scrollbar-none">
        <Link
          href="/products"
          className="inline-flex shrink-0 items-center rounded-full bg-[#1c1917] px-3 py-2 text-xs font-semibold text-white"
        >
          All
        </Link>
        {storeList.map((store) => (
          <Link
            key={store.id}
            href={`/stores/${store.id}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#e7e5e4] bg-white px-3 py-2 text-xs font-medium text-[#57534e] transition hover:border-[#5f8a7a]/40 hover:text-[#4d7366]"
          >
            <Icon name={store.id} size={14} className="text-[#5f8a7a]" />
            {store.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
