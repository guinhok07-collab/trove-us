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
        </ul>
        <p className="mt-2">
          We do not sell your personal data to third parties.
        </p>
      </PolicySection>

      <PolicySection title="Cookies">
        <p>
          We use essential cookies to keep your cart working and remember your
          session. Optional analytics cookies may be added in the future — you
          will be able to opt out.
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
