"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { isLandingPath } from "@/lib/landing/paths";

export function LandingAwareFooter() {
  const pathname = usePathname();

  if (isLandingPath(pathname)) {
    return (
      <footer className="mt-auto hidden border-t border-[#e7e5e4] bg-white py-4 sm:block">
        <p className="text-center text-xs text-[#a8a29e]">
          Secure checkout · 30-day returns · orders@trove-us.com
        </p>
      </footer>
    );
  }

  return <SiteFooter />;
}
