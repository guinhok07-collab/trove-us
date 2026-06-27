import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/data/brand";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { RETURN_FRAUD_RULES, RETURN_STEPS } from "@/lib/returns/policy";

export const metadata: Metadata = {
  title: `Shipping & Returns — ${brand.name}`,
  description: `Shipping times, free delivery on every order, and 30-day return policy at ${brand.name}.`,
};

export default function ShippingReturnsPage() {
  return (
    <PolicyLayout title="Shipping & Returns">
      <PolicySection title="Shipping">
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>Ships from US warehouses to all 50 states</li>
          <li>Most orders arrive in 3–5 business days</li>
          <li>Free standard shipping on every order — included in the price</li>
          <li>
            You&apos;ll receive a tracking number by email once your order ships
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="Returns & refunds">
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>30-day return window from delivery date</li>
          <li>Items must be unused and in original packaging</li>
          <li>Full refund or exchange — your choice</li>
          <li>
            Start online at our{" "}
            <Link href="/returns" className="font-medium text-[#5f8a7a] hover:underline">
              return request page
            </Link>{" "}
            (order number + email required)
          </li>
          <li>
            Refunds processed within 5–7 business days after we approve the return
          </li>
        </ul>
        <ol className="mt-4 list-inside list-decimal space-y-1.5">
          {RETURN_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </PolicySection>

      <PolicySection title="Return fraud policy">
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          {RETURN_FRAUD_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
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
          <strong className="text-[#1c1917]">Ready to return an item?</strong>{" "}
          <Link href="/returns" className="font-medium text-[#5f8a7a] hover:underline">
            Start a return request
          </Link>{" "}
          — or email{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="font-medium text-[#5f8a7a] hover:underline"
          >
            {brand.supportEmail}
          </a>{" "}
          with your order number.
        </p>
      </div>
    </PolicyLayout>
  );
}
