import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/data/brand";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { policyLastUpdated } from "@/lib/site";

export const metadata: Metadata = {
  title: `Terms of Service — ${brand.name}`,
  description: `Terms and conditions for shopping at ${brand.name}.`,
};

export default function TermsPage() {
  return (
    <PolicyLayout title="Terms of Service">
      <p className="text-xs text-[#a8a29e]">Last updated: {policyLastUpdated}</p>

      <PolicySection title="Overview">
        <p>
          By using {brand.name} ({brand.suggestedDomain}), you agree to these
          terms. If you do not agree, please do not use our website or place an
          order.
        </p>
      </PolicySection>

      <PolicySection title="Orders & pricing">
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>All prices are listed in USD unless stated otherwise.</li>
          <li>
            We reserve the right to cancel orders affected by pricing errors,
            stock issues, or suspected fraud.
          </li>
          <li>
            Order confirmation is sent by email once payment is successfully
            processed.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="Shipping">
        <p>
          We ship to all 50 US states. Delivery times are estimates (typically
          3–5 business days) and may vary by location and product availability.
          See our{" "}
          <Link href="/shipping-returns" className="text-[#5f8a7a] hover:underline">
            Shipping & Returns
          </Link>{" "}
          page for details.
        </p>
      </PolicySection>

      <PolicySection title="Returns">
        <p>
          Most items can be returned within 30 days of delivery in unused
          condition. Start at our{" "}
          <Link href="/returns" className="text-[#5f8a7a] hover:underline">
            return request page
          </Link>{" "}
          or contact {brand.supportEmail} before sending anything back.
        </p>
      </PolicySection>

      <PolicySection title="Product information">
        <p>
          We work to display accurate descriptions and images. Colors and sizes
          may vary slightly. {brand.name} is not responsible for misuse of
          products or for medical claims unless explicitly stated on the
          product page.
        </p>
      </PolicySection>

      <PolicySection title="Limitation of liability">
        <p>
          {brand.name} is provided &quot;as is.&quot; We are not liable for
          indirect damages arising from use of our products or website beyond
          the amount you paid for the affected order.
        </p>
      </PolicySection>

      <PolicySection title="Contact">
        <p>
          Questions about these terms? Email{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="font-medium text-[#5f8a7a] hover:underline"
          >
            {brand.supportEmail}
          </a>
          .
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
