import Link from "next/link";
import { copy } from "@/data/brand";
import { Icon } from "@/components/icons";

export function FreeShippingBanner() {
  return (
    <section
      className="relative mt-3 overflow-hidden rounded-xl border border-[#4d7366]/20 bg-gradient-to-br from-[#1c1917] via-[#2d3d36] to-[#4d7366] px-4 py-5 shadow-lg sm:mt-5 sm:rounded-2xl sm:px-8 sm:py-7"
      aria-label="Free shipping promotion"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#5f8a7a]/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-1/4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 sm:h-14 sm:w-14 sm:rounded-2xl">
            <Icon name="truck" size={26} className="text-[#bbf7d0]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#bbf7d0] sm:text-[11px]">
              {copy.freeShippingBannerBadge}
            </p>
            <h2 className="mt-1 text-lg font-semibold leading-tight text-white sm:text-2xl">
              {copy.freeShippingBannerTitle}
            </h2>
            <p className="mt-1 text-sm font-medium text-[#dcfce7] sm:text-base">
              {copy.freeShippingBannerHighlight}
            </p>
            <p className="mt-1.5 hidden max-w-xl text-sm leading-relaxed text-white/75 sm:block">
              {copy.freeShippingBannerSub}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:shrink-0 sm:items-end">
          <ul className="flex flex-wrap gap-2 sm:justify-end">
            {copy.freeShippingBannerPerks.map((perk) => (
              <li
                key={perk}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-white/10 sm:text-xs"
              >
                <span className="text-[#86efac]" aria-hidden>
                  ✓
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <Link
            href="/products"
            className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1c1917] transition hover:bg-[#f0fdf4] sm:w-auto"
          >
            {copy.freeShippingBannerCta} →
          </Link>
        </div>
      </div>
    </section>
  );
}
