import type { Metadata } from "next";
import { brand } from "@/data/brand";
import TrackOrderClient from "./track-order-client";

export const metadata: Metadata = {
  title: `Track Order — ${brand.name}`,
  description: `Track your ${brand.name} order status and shipping updates.`,
};

export default function TrackOrderPage() {
  return <TrackOrderClient />;
}
