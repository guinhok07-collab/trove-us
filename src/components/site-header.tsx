"use client";

import Link from "next/link";
import { brand } from "@/data/brand";
import { useCart } from "@/context/cart-context";
import { DesktopCategoryPills } from "@/components/category-nav";

export function SiteHeader() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-[#e7e5e4]/80 bg-[#faf9f7] pt-[env(safe-area-inset-top)] sm:bg-[#faf9f7]/95 sm:backdrop-blur-md">
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
          className="hidden min-w-0 flex-1 md:block"
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

        <form action="/products" className="min-w-0 flex-1 md:hidden" role="search">
          <input
            type="search"
            name="q"
            placeholder="Search..."
            className="w-full rounded-xl border border-[#e7e5e4] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#eef4f1]"
          />
        </form>

        <nav className="hidden shrink-0 items-center gap-1 sm:flex">
          <Link
            href="/about"
            className="rounded-full px-3 py-2 text-sm font-medium text-[#57534e] hover:bg-white hover:text-[#1c1917]"
          >
            About
          </Link>
          <Link
            href="/products"
            className="rounded-full px-3 py-2 text-sm font-medium text-[#57534e] hover:bg-white hover:text-[#1c1917]"
          >
            Shop
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-2 rounded-full bg-[#5f8a7a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4d7366]"
          >
            Cart
            {itemCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1c1917] px-1 text-[10px] font-bold">
                {itemCount}
              </span>
            ) : null}
          </Link>
        </nav>
      </div>

      <DesktopCategoryPills />
    </header>
  );
}
