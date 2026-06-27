import type { Metadata } from "next";
import Link from "next/link";
import { FaqList, WhyShopGrid } from "@/components/faq-list";
import { brand, copy } from "@/data/brand";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: `About — ${brand.name}`,
  description: copy.aboutText,
};

export default function AboutPage() {
  return (
    <PolicyLayout title={`About ${brand.name}`}>
      <p className="text-base leading-relaxed text-[#57534e]">{copy.aboutText}</p>
      <p className="text-sm font-medium text-[#5f8a7a]">{brand.tagline}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Delivery", value: "3–5 business days" },
          { label: "Free shipping", value: "Every order" },
          { label: "Returns", value: "30-day window" },
          { label: "Coverage", value: "All 50 states" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#e7e5e4] bg-white px-3 py-3 text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#a8a29e]">
              {stat.label}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#1c1917] sm:text-sm">{stat.value}</p>
          </div>
        ))}
      </div>

      <PolicySection title={copy.whyShopTitle}>
        <WhyShopGrid items={copy.whyShop} />
      </PolicySection>

      <PolicySection title="Shipping & delivery">
        <ul className="mt-2 space-y-2">
          <li className="flex gap-2">
            <span className="font-semibold text-[#5f8a7a]">✓</span>
            <span>{brand.shippingLine}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-[#5f8a7a]">✓</span>
            <span>{brand.deliveryLine}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-[#5f8a7a]">✓</span>
            <span>{brand.locationLine}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-[#5f8a7a]">✓</span>
            <span>Free standard shipping on every order — no extra fee at checkout</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-[#5f8a7a]">✓</span>
            <span>Tracking number emailed when your order ships</span>
          </li>
        </ul>
        <p className="mt-4">
          <Link href="/shipping-returns" className="font-medium text-[#5f8a7a] hover:underline">
            Full shipping & returns policy →
          </Link>
        </p>
      </PolicySection>

      <PolicySection title="What we believe">
        <ul className="mt-2 space-y-2">
          {copy.aboutPoints.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="font-semibold text-[#5f8a7a]">✓</span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </PolicySection>

      <PolicySection title="Payments & trust">
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {copy.trustStrip.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 rounded-lg border border-[#f5f5f4] bg-[#fafaf9] px-3 py-2 text-sm text-[#57534e]"
            >
              <span className="text-[#5f8a7a]">✓</span>
              {item.label}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">{brand.trustLine}</p>
      </PolicySection>

      <PolicySection title={copy.aboutFaqTitle}>
        <FaqList items={copy.aboutFaq} />
      </PolicySection>

      <PolicySection title={copy.guaranteeTitle}>
        <p>{copy.guaranteeText}</p>
        <p className="mt-3">{copy.promiseText}</p>
      </PolicySection>

      <div className="rounded-xl border border-[#e7e5e4] bg-[#eef4f1] p-5 sm:p-6">
        <p className="font-semibold text-[#1c1917]">Still have questions?</p>
        <p className="mt-2">
          {copy.contactHelpIntro} Reach us at{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="font-medium text-[#5f8a7a] hover:underline"
          >
            {brand.supportEmail}
          </a>
          . {copy.contactHelpResponse}
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/track" className="text-[#5f8a7a] hover:text-[#4d7366]">
            Track an order →
          </Link>
          <Link href="/returns" className="text-[#5f8a7a] hover:text-[#4d7366]">
            Start a return →
          </Link>
          <Link href="/products" className="text-[#5f8a7a] hover:text-[#4d7366]">
            Shop now →
          </Link>
        </div>
      </div>
    </PolicyLayout>
  );
}
