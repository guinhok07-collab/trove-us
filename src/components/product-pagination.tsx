import Link from "next/link";
import { PaginationGoForm } from "@/components/pagination-go-form";

const MAX_VISIBLE_PAGES = 5;

interface ProductPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  /** Path + query without `page`, e.g. `/products?store=pet&q=leash` or `/products` */
  hrefBase: string;
}

function pageHref(base: string, page: number): string {
  const join = base.includes("?") ? "&" : "?";
  return page <= 1 ? base : `${base}${join}page=${page}`;
}

function visiblePages(current: number, total: number): number[] {
  if (total <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  let start = Math.max(1, current - 2);
  const end = Math.min(total, start + MAX_VISIBLE_PAGES - 1);
  start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export function ProductPagination({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  hrefBase,
}: ProductPaginationProps) {
  if (totalPages <= 1) return null;

  const pages = visiblePages(currentPage, totalPages);
  const from = (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, totalItems);

  const btn =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#e7e5e4] bg-white px-2 text-sm font-medium text-[#57534e] transition hover:border-[#5f8a7a]/40 hover:text-[#4d7366] disabled:pointer-events-none disabled:opacity-40";
  const active =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#5f8a7a] bg-[#5f8a7a] px-2 text-sm font-semibold text-white";

  return (
    <nav
      className="mt-10 flex flex-col items-center gap-4 border-t border-[#f5f5f4] pt-8 sm:flex-row sm:justify-between"
      aria-label="Product pages"
    >
      <p className="text-sm text-[#78716c]">
        <span className="font-medium text-[#1c1917]">{totalItems}</span> products
        · showing {from}–{to}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-1.5">
        {currentPage > 1 ? (
          <>
            <Link href={pageHref(hrefBase, 1)} className={btn} aria-label="First page">
              «
            </Link>
            <Link
              href={pageHref(hrefBase, currentPage - 1)}
              className={btn}
              aria-label="Previous page"
            >
              ‹
            </Link>
          </>
        ) : (
          <>
            <span className={btn} aria-hidden>
              «
            </span>
            <span className={btn} aria-hidden>
              ‹
            </span>
          </>
        )}

        {pages.map((p) =>
          p === currentPage ? (
            <span key={p} className={active} aria-current="page">
              {p}
            </span>
          ) : (
            <Link key={p} href={pageHref(hrefBase, p)} className={btn}>
              {p}
            </Link>
          ),
        )}

        {currentPage < totalPages ? (
          <>
            <Link
              href={pageHref(hrefBase, currentPage + 1)}
              className={btn}
              aria-label="Next page"
            >
              ›
            </Link>
            <Link
              href={pageHref(hrefBase, totalPages)}
              className={btn}
              aria-label="Last page"
            >
              »
            </Link>
          </>
        ) : (
          <>
            <span className={btn} aria-hidden>
              ›
            </span>
            <span className={btn} aria-hidden>
              »
            </span>
          </>
        )}
        </div>

        <PaginationGoForm
          hrefBase={hrefBase}
          totalPages={totalPages}
          currentPage={currentPage}
        />
      </div>

      <p className="text-sm text-[#a8a29e]">
        Showing: {currentPage} of {totalPages}
      </p>
    </nav>
  );
}

export const PRODUCTS_PER_PAGE = 24;

export function paginate<T>(items: T[], page: number, perPage = PRODUCTS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    currentPage,
    totalPages,
    perPage,
    totalItems: items.length,
  };
}

export function buildProductsHrefBase(params: {
  store?: string;
  q?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.store) sp.set("store", params.store);
  if (params.q?.trim()) sp.set("q", params.q.trim());
  const qs = sp.toString();
  return qs ? `/products?${qs}` : "/products";
}
