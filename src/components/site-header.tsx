"use client";

import Link from "next/link";
import { brand } from "@/data/brand";
import { useCart } from "@/context/cart-context";
import { storeList } from "@/data/stores";

export function SiteHeader() {
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-[#e7e5e4]/80 bg-[#faf9f7]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#5f8a7a] font-display text-base font-semibold text-white">
            T
          </span>
          <div className="leading-none">
            <p className="font-display text-xl font-semibold tracking-tight text-[#1c1917]">
              {brand.name}
            </p>
            <p className="mt-1 hidden text-xs font-normal text-[#78716c] sm:block">
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

        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/about"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-[#57534e] hover:bg-white hover:text-[#1c1917] sm:px-3"
          >
            About
          </Link>
          <Link
            href="/products"
            className="rounded-full px-2.5 py-2 text-sm font-medium text-[#57534e] hover:bg-white hover:text-[#1c1917] sm:px-3"
          >
            Shop
          </Link>
          <Link
            href="/cart"
            className="relative ml-1 flex items-center gap-2 rounded-full bg-[#5f8a7a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4d7366]"
          >
            <CartIcon />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1c1917] px-1 text-[10px] font-bold">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>
      </div>

      <div className="border-t border-[#e7e5e4]/60 bg-white/50 px-4 py-2.5">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto">
          {storeList.map((store) => (
            <Link
              key={store.id}
              href={`/stores/${store.id}`}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-[#78716c] transition hover:bg-[#eef4f1] hover:text-[#4d7366]"
            >
              {store.name}
            </Link>
          ))}
        </div>
      </div>

      <form
        action="/products"
        className="border-t border-[#e7e5e4]/60 px-4 py-2.5 md:hidden"
      >
        <input
          type="search"
          name="q"
          placeholder="Search products..."
          className="w-full rounded-xl border border-[#e7e5e4] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#eef4f1]"
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
