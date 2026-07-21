"use client";

import { usePathname } from "next/navigation";
import { TrustStrip } from "@/components/trust-strip";
import { isLandingPath } from "@/lib/landing/paths";

export function LandingAwareTrustStrip({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  if (isLandingPath(pathname)) return null;
  return <TrustStrip className={className} />;
}
