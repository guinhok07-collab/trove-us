"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/context/cart-context";
import { MobileCategoryGrid } from "@/components/category-nav";

function NavIcon({ children }: { children: React.ReactNode }) {
  return <span className="flex h-6 w-6 items-center justify-center">{children}</span>;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const hideBar =
    pathname.startsWith("/checkout") ||
    (pathname.startsWith("/products/") && pathname !== "/products");

  if (hideBar) return null;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const tabClass = (href: string) =>
    `flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-semibold ${
      isActive(href) ? "text-[#4d7366]" : "text-[#78716c]"
    }`;

  return (
    <>
      {categoriesOpen ? (
        <button
          type="button"
          aria-label="Close categories"
          className="fixed inset-0 z-40 bg-[#1c1917]/40 md:hidden"
          onClick={() => setCategoriesOpen(false)}
        />
      ) : null}

      <div
        className={`fixed inset-x-0 bottom-[3.75rem] z-[60] max-h-[70dvh] overflow-y-auto rounded-t-2xl border border-[#e7e5e4] bg-[#fafaf9] shadow-[0_-8px_30px_rgb(28_25_23_/12%)] transition-transform duration-200 md:hidden ${
          categoriesOpen ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!categoriesOpen}
      >
        <div className="flex justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-[#d6d3d1]" />
        </div>
        <div className="px-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold text-[#1c1917]">Categories</p>
            <button
              type="button"
              onClick={() => setCategoriesOpen(false)}
              className="rounded-full px-2 py-1 text-xs font-medium text-[#78716c]"
            >
              Close
            </button>
          </div>
          <MobileCategoryGrid embedded onNavigate={() => setCategoriesOpen(false)} />
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e7e5e4] bg-white/95 backdrop-blur-md pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 md:hidden"
        aria-label="Mobile"
      >
        <div className="mx-auto flex max-w-lg items-stretch px-1">
          <Link href="/" className={tabClass("/")}>
            <NavIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V20h14V9.5" />
              </svg>
            </NavIcon>
            Home
          </Link>
          <Link href="/products" className={tabClass("/products")}>
            <NavIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <path d="M3 6h18" />
              </svg>
            </NavIcon>
            Shop
          </Link>
          <button
            type="button"
            onClick={() => setCategoriesOpen(true)}
            className={`${tabClass("/stores")} ${categoriesOpen ? "text-[#4d7366]" : ""}`}
          >
            <NavIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </NavIcon>
            Categories
          </button>
          <Link href="/cart" className={`relative ${tabClass("/cart")}`}>
            <NavIcon>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5">
                <path d="M6 6h15l-1.5 9h-12z" />
                <path d="M6 6 5 3H2" />
                <circle cx="9" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
            </NavIcon>
            Cart
            {itemCount > 0 ? (
              <span className="absolute right-[calc(50%-1.25rem)] top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1c1917] px-1 text-[9px] font-bold text-white">
                {itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </nav>
    </>
  );
}
