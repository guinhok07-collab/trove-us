"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface PaginationGoFormProps {
  hrefBase: string;
  totalPages: number;
  currentPage: number;
}

function pageHref(base: string, page: number): string {
  const join = base.includes("?") ? "&" : "?";
  return page <= 1 ? base : `${base}${join}page=${page}`;
}

export function PaginationGoForm({
  hrefBase,
  totalPages,
  currentPage,
}: PaginationGoFormProps) {
  const router = useRouter();
  const [value, setValue] = useState(String(currentPage));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = Number.parseInt(value, 10);
    const page = Number.isFinite(parsed)
      ? Math.min(Math.max(1, parsed), totalPages)
      : 1;
    router.push(pageHref(hrefBase, page));
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <label htmlFor="page-go" className="sr-only">
        Go to page
      </label>
      <input
        id="page-go"
        type="number"
        min={1}
        max={totalPages}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-14 rounded-lg border border-[#e7e5e4] bg-white px-2 text-center text-sm text-[#1c1917] outline-none focus:border-[#5f8a7a]/50"
        aria-label="Page number"
      />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e7e5e4] bg-white px-3 text-sm font-medium text-[#57534e] transition hover:border-[#5f8a7a]/40 hover:text-[#4d7366]"
      >
        Go
      </button>
    </form>
  );
}
