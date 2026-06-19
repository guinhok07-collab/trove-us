import type { Metadata } from "next";
import { brand } from "@/data/brand";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: `Shipping & Returns — ${brand.name}`,
  description: `Shipping times, free shipping threshold, and 30-day return policy at ${brand.name}.`,
};

export default function ShippingReturnsPage() {
  return (
    <PolicyLayout title="Shipping & Returns">
      <PolicySection title="Shipping">
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>We ship to all 50 US states</li>
          <li>Most orders arrive in 3–5 business days</li>
          <li>Free standard shipping on orders over $35</li>
          <li>
            You&apos;ll receive a tracking number by email once your order ships
          </li>
          <li>Shipping cost for orders under $35: $4.99 flat rate</li>
        </ul>
      </PolicySection>

      <PolicySection title="Returns & refunds">
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>30-day return window from delivery date</li>
          <li>Items must be unused and in original packaging</li>
          <li>Full refund or exchange — your choice</li>
          <li>
            Contact us first at {brand.supportEmail} to start a return
          </li>
          <li>
            Refunds processed within 5–7 business days after we receive the item
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="Non-returnable items">
        <p>
          Opened personal care items, custom orders, and final-sale products may
          not be eligible for return. If in doubt, email us before ordering.
        </p>
      </PolicySection>

      <div className="rounded-xl border border-[#e7e5e4] bg-[#eef4f1] p-6">
        <p>
          <strong className="text-[#1c1917]">Need help with an order?</strong>{" "}
          Email{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="font-medium text-[#5f8a7a] hover:underline"
          >
            {brand.supportEmail}
          </a>{" "}
          with your order number and we&apos;ll take care of you.
        </p>
      </div>
    </PolicyLayout>
  );
}
