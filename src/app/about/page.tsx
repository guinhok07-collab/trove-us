import type { Metadata } from "next";
import Link from "next/link";
import { brand, copy } from "@/data/brand";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";

export const metadata: Metadata = {
  title: `About — ${brand.name}`,
  description: copy.aboutText,
};

export default function AboutPage() {
  return (
    <PolicyLayout title={`About ${brand.name}`}>
      <p>{copy.aboutText}</p>

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

      <PolicySection title="Our guarantee">
        <p>{copy.guaranteeText}</p>
      </PolicySection>

      <div className="rounded-xl border border-[#e7e5e4] bg-[#faf9f7] p-6">
        <p className="font-semibold text-[#1c1917]">Questions?</p>
        <p className="mt-2">
          We&apos;re a small team focused on great products and honest service.
          Reach us anytime at{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="font-medium text-[#5f8a7a] hover:underline"
          >
            {brand.supportEmail}
          </a>
          . We typically respond within 24 hours.
        </p>
      </div>
    </PolicyLayout>
  );
}
