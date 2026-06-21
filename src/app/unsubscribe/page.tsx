import type { Metadata } from "next";
import { brand, copy } from "@/data/brand";
import UnsubscribePageClient from "./unsubscribe-client";

export const metadata: Metadata = {
  title: `${copy.dealsPageTitle} — ${brand.name}`,
  description: copy.dealsPageText,
  robots: { index: true, follow: true },
};

export default function UnsubscribePage() {
  return <UnsubscribePageClient />;
}
