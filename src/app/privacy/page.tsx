import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/data/brand";
import { PolicyLayout, PolicySection } from "@/components/policy-layout";
import { policyLastUpdated } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy — ${brand.name}`,
  description: `How ${brand.name} collects, uses, and protects your personal information.`,
};

export default function PrivacyPage() {
  return (
    <PolicyLayout title="Privacy Policy">
      <p className="text-xs text-[#a8a29e]">Last updated: {policyLastUpdated}</p>

      <PolicySection title="Information we collect">
        <p>
          When you place an order, we collect your name, shipping address, email
          address, and payment information necessary to fulfill your order. We
          may also collect basic browsing data (pages visited, products viewed)
          to improve the store experience.
        </p>
      </PolicySection>

      <PolicySection title="How we use your information">
        <ul className="mt-2 list-inside list-disc space-y-1.5">
          <li>Process and fulfill orders</li>
          <li>Send shipping updates and order confirmations</li>
          <li>Provide customer support</li>
          <li>Improve our website and product selection</li>
          <li>
            Send promotional emails about deals and new products — only if you
            opt in (footer signup or checkout checkbox)
          </li>
        </ul>
        <p className="mt-2">
          We do not sell your personal data to third parties.
        </p>
      </PolicySection>

      <PolicySection title="Marketing emails">
        <p>
          If you join our deals list or check the box at checkout, we may email
          you occasional offers and new arrivals. You can unsubscribe anytime
          from any message or at{" "}
          <Link href="/unsubscribe" className="font-medium text-[#5f8a7a] hover:underline">
            trove-us.com/unsubscribe
          </Link>
          . Order-related emails (confirmations, tracking) are separate and
          still sent when you purchase.
        </p>
      </PolicySection>

      <PolicySection title="Cookies">
        <p>
          We use essential cookies to keep your cart working and remember your
          session. When enabled, we may use the Meta (Facebook) Pixel to measure
          ad performance and site usage — this helps us show relevant offers and
          improve the store. You can limit ad tracking in your browser or Meta
          account settings.
        </p>
      </PolicySection>

      <PolicySection title="Payment security">
        <p>
          Payments are processed securely through trusted payment providers
          (PayPal, Stripe). We do not store full credit card numbers on our
          servers.
        </p>
      </PolicySection>

      <PolicySection title="Data retention">
        <p>
          Order records are kept as long as needed for accounting, tax, and
          customer support purposes, then securely deleted or anonymized.
        </p>
      </PolicySection>

      <PolicySection title="Your rights">
        <p>
          You may request access to, correction of, or deletion of your personal
          data by emailing {brand.supportEmail}. California residents may have
          additional rights under the CCPA.
        </p>
      </PolicySection>

      <PolicySection title="Contact">
        <p>
          Questions about privacy? Email{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="font-medium text-[#5f8a7a] hover:underline"
          >
            {brand.supportEmail}
          </a>{" "}
          or read our{" "}
          <Link href="/terms" className="text-[#5f8a7a] hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </PolicySection>
    </PolicyLayout>
  );
}
