"use client";

import Link from "next/link";
import { brand } from "@/data/brand";
import { useCart } from "@/context/cart-context";
import { storeList, storeShortNames } from "@/data/stores";

export function SiteHeader() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-[#e7e5e4]/80 bg-[#faf9f7]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2 sm:gap-4 sm:px-6 sm:py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#5f8a7a] font-display text-sm font-semibold text-white sm:h-10 sm:w-10 sm:rounded-2xl sm:text-base">
            T
          </span>
          <div className="leading-none">
            <p className="font-display text-base font-semibold tracking-tight text-[#1c1917] sm:text-xl">
              {brand.name}
            </p>
            <p className="mt-0.5 hidden text-xs font-normal text-[#78716c] sm:block">
              {brand.tagline}
            </p>
          </div>
        </Link>

        <form
          action="/products"
          className="hidden flex-1 md:block"
          role="search"
        >
          <div className="relative max-w-xl">
            <input
              type="search"
              name="q"
              placeholder="Search products..."
              className="w-full rounded-full border border-[#e7e5e4] bg-white py-2.5 pl-4 pr-24 text-sm text-[#1c1917] placeholder:text-[#a8a29e] outline-none transition focus:border-[#5f8a7a]/50 focus:ring-2 focus:ring-[#eef4f1]"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 rounded-full bg-[#1c1917] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#292524]"
            >
              Search
            </button>
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Link
            href="/about"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#57534e] hover:bg-white hover:text-[#1c1917] sm:inline-flex"
          >
            About
          </Link>
          <Link
            href="/products"
            className="rounded-full px-2 py-1.5 text-xs font-medium text-[#57534e] hover:bg-white hover:text-[#1c1917] sm:px-3 sm:py-2 sm:text-sm"
          >
            Shop
          </Link>
          <Link
            href="/cart"
            className="relative ml-0.5 flex items-center gap-1.5 rounded-full bg-[#5f8a7a] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4d7366] sm:ml-1 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <CartIcon />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1c1917] px-0.5 text-[9px] font-bold sm:h-5 sm:min-w-5 sm:text-[10px]">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      <div className="scroll-fade-x border-t border-[#e7e5e4]/60 bg-white/60">
        <div className="mx-auto flex max-w-7xl snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-pl-3 px-3 py-1.5 pr-6 scrollbar-none sm:gap-2 sm:scroll-pl-0 sm:px-4 sm:py-2 sm:pr-4">
          <Link
            href="/products"
            className="shrink-0 snap-start rounded-full bg-[#1c1917] px-2.5 py-1 text-[11px] font-semibold text-white sm:px-3 sm:py-1.5 sm:text-xs"
          >
            All
          </Link>
          {storeList.map((store) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className="shrink-0 snap-start rounded-full border border-[#e7e5e4] bg-white px-2.5 py-1 text-[11px] font-medium text-[#57534e] transition hover:border-[#5f8a7a]/40 hover:text-[#4d7366] sm:px-3 sm:py-1.5 sm:text-xs"
            >
              <span className="sm:hidden">{storeShortNames[store.id]}</span>
              <span className="hidden sm:inline">{store.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <form
        action="/products"
        className="border-t border-[#e7e5e4]/60 px-3 py-1.5 md:hidden"
      >
        <input
          type="search"
          name="q"
          placeholder="Search products..."
          className="w-full rounded-lg border border-[#e7e5e4] bg-white px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#eef4f1]"
        />
      </form>
    </header>
  );
}

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-4 w-4"
    >
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
