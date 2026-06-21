import type { Metadata } from "next";
import { brand, copy } from "@/data/brand";
import UnsubscribePageClient from "./unsubscribe-client";

export const metadata: Metadata = {
  title: `${copy.unsubscribeTitle} — ${brand.name}`,
  description: copy.unsubscribeText,
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return <UnsubscribePageClient />;
}
