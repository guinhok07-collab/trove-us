import type { Metadata } from "next";
import { brand } from "@/data/brand";
import ReturnRequestClient from "./return-request-client";

export const metadata: Metadata = {
  title: `Start a Return — ${brand.name}`,
  description: `Request a return or refund at ${brand.name}. Verified by order number and email. 30-day return window.`,
};

export default function ReturnsPage() {
  return <ReturnRequestClient />;
}
