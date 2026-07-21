"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { saveLandingPromo } from "@/lib/landing/promo";
import { isLandingPath } from "@/lib/landing/paths";

export const SITE_EXIT_PROMO_CODE = "TROVE10";
const STORAGE_KEY = "trove-site-exit-intent";

const BLOCKED_PREFIXES = ["/checkout", "/cart", "/admin", "/analytics", "/order/", "/lp/"];

function isBlockedPath(pathname: string | null): boolean {
  if (!pathname) return true;
  if (isLandingPath(pathname)) return true;
  return BLOCKED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function SiteExitIntentModal() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isBlockedPath(pathname)) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    function onMouseOut(event: MouseEvent) {
      if (event.clientY > 0 || open) return;
      sessionStorage.setItem(STORAGE_KEY, "1");
      setOpen(true);
    }

    document.addEventListener("mouseout", onMouseOut);
    return () => document.removeEventListener("mouseout", onMouseOut);
  }, [pathname, open]);

  function handleContinue() {
    saveLandingPromo(SITE_EXIT_PROMO_CODE, "site");
    setOpen(false);
    router.push("/products");
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1c1917]/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-exit-intent-title"
      onClick={() => setOpen(false)}
    >
      <div
        className="card relative w-full max-w-md p-6 text-center sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-[#a8a29e] transition hover:bg-[#f5f5f4] hover:text-[#57534e]"
          aria-label="Close"
        >
          ✕
        </button>

        <p className="text-label text-[#4d7366]">Before you go</p>
        <h2 id="site-exit-intent-title" className="mt-2 text-xl font-semibold text-[#1c1917] sm:text-2xl">
          Take 10% off your first order
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#78716c]">
          Use this code at checkout on any Trove order — valid for the next 15 minutes.
        </p>

        <p className="mt-5 inline-block rounded-lg border border-dashed border-[#5f8a7a] bg-[#eef4f1] px-4 py-2 font-mono text-sm font-semibold tracking-wide text-[#4d7366]">
          {SITE_EXIT_PROMO_CODE}
        </p>

        <button type="button" onClick={handleContinue} className="btn-primary mt-5 w-full py-3.5">
          Shop with code
        </button>
      </div>
    </div>
  );
}
