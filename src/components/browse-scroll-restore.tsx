"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { clearBrowseReturn, matchesBrowseReturn } from "@/lib/browse-return";

export function BrowseScrollRestore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const restoredRef = useRef<string | null>(null);

  useEffect(() => {
    const query = searchParams.toString();
    const current = query ? `${pathname}?${query}` : pathname;

    if (restoredRef.current === current) return;

    const state = matchesBrowseReturn(current);
    if (!state) return;

    restoredRef.current = current;
    const targetY = state.scrollY;
    let attempts = 0;

    const tryRestore = () => {
      window.scrollTo(0, targetY);
      attempts += 1;

      if (attempts < 10 && Math.abs(window.scrollY - targetY) > 48) {
        window.setTimeout(tryRestore, 80);
        return;
      }

      if (state.fromSlug) {
        const el = document.getElementById(`browse-${state.fromSlug}`);
        el?.scrollIntoView({ block: "center", behavior: "auto" });
        el?.classList.add("browse-return-highlight");
        window.setTimeout(() => {
          el?.classList.remove("browse-return-highlight");
        }, 1800);
      }

      clearBrowseReturn();
    };

    window.requestAnimationFrame(tryRestore);
  }, [pathname, searchParams]);

  return null;
}
