import Link from "next/link";
import { brand, copy } from "@/data/brand";
import { Icon, type TrustIconName } from "@/components/icons";

function PaymentMarks() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-hidden>
      <span className="rounded bg-[#003087] px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">
        PayPal
      </span>
      <span className="rounded border border-[#1a1f71]/30 bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#1a1f71]">
        VISA
      </span>
      <span className="inline-flex items-center gap-0.5 rounded border border-[#e7e5e4] bg-white px-1 py-0.5">
        <span className="h-2 w-2 rounded-full bg-[#eb001b]" />
        <span className="-ml-1 h-2 w-2 rounded-full bg-[#f79e1b]" />
      </span>
    </div>
  );
}

type HomeTrustItem = {
  icon: TrustIconName;
  label: string;
  paymentMarks?: boolean;
};

export function HomePaymentTrust() {
  const items = copy.homePaymentTrust as readonly HomeTrustItem[];

  return (
    <section
      className="mt-5 scroll-mt-28 sm:mt-8 sm:scroll-mt-32"
      aria-label="Payments and trust"
    >
      <div className="rounded-xl border border-[#e7e5e4] bg-white px-3 py-4 sm:rounded-2xl sm:px-6 sm:py-6">
        <div className="text-center">
          <h2 className="section-title">{copy.homePaymentTrustTitle}</h2>
          <p className="mx-auto mt-1.5 max-w-lg text-xs text-[#78716c] sm:text-sm">
            {brand.trustLine}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center rounded-xl border border-[#f5f5f4] bg-[#fafaf9] px-2 py-3 text-center sm:px-3 sm:py-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef4f1] sm:h-10 sm:w-10">
                <Icon name={item.icon} size={18} className="text-[#5f8a7a]" />
              </span>
              <p className="mt-2 text-[11px] font-semibold leading-snug text-[#44403c] sm:text-xs">
                {item.label}
              </p>
              {item.paymentMarks ? <PaymentMarks /> : null}
            </div>
          ))}
        </div>

        <p className="mt-4 text-center">
          <Link
            href="/shipping-returns"
            className="text-xs font-semibold text-[#5f8a7a] hover:text-[#4d7366] hover:underline sm:text-sm"
          >
            See full shipping & returns policy →
          </Link>
        </p>
      </div>
    </section>
  );
}
