"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { readTrafficAttribution, recordTrafficEvent } from "@/lib/traffic/client";

export function TrackSiteTraffic() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const path = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ""}`;
    if (lastPath.current === path) return;
    lastPath.current = path;

    recordTrafficEvent({
      type: "page_view",
      path,
      ...readTrafficAttribution(),
    });
  }, [pathname, searchParams]);

  return null;
}
